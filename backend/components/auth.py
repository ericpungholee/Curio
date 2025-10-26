from flask import Blueprint, request, jsonify
from .common import supabase, retry_supabase_auth_call, get_user_id_from_token

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    print("=== Registration request received ===")
    try:
        body = request.get_json()
        if not body:
            print("ERROR: Request body is empty")
            return jsonify({"error": "Request body is required"}), 400
    except Exception as e:
        print(f"ERROR: Failed to parse request body: {e}")
        return jsonify({"error": "Request body is required"}), 400
    
    try:
        email = body.get("email")
        password = body.get("password")
        username = body.get("username")
        firstName = body.get("firstName")
        lastName = body.get("lastName")
        
        print(f"Registration attempt for: email={email}, username={username}")

        if not email or not password or not username:
            print("ERROR: Missing required fields")
            return jsonify({"error": "Email, password, and username are required"}), 400

        # Check if username already exists
        try:
            existing_user = supabase.table("profiles").select("username").eq("username", username).execute()
            if existing_user.data:
                return jsonify({"error": "Username already taken"}), 400
        except Exception as e:
            print(f"Error checking username: {e}")

        # Register user with Supabase Auth
        def signup_call():
            return supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "username": username,
                        "firstName": firstName or "",
                        "lastName": lastName or ""
                    }
                }
            })
        
        try:
            resp = retry_supabase_auth_call(signup_call)
        except Exception as auth_error:
            error_str = str(auth_error).lower()
            print(f"Auth signup error: {auth_error}")
            
            # Handle specific errors
            if "already registered" in error_str or "user already exists" in error_str:
                print(f"User already registered: {email}")
                return jsonify({"error": "Email already registered"}), 400
            elif "invalid" in error_str and "email" in error_str:
                return jsonify({"error": "Invalid email address"}), 400
            else:
                return jsonify({"error": f"Registration failed: {str(auth_error)}"}), 500
        
        # Check if response is None (retry failed)
        if resp is None:
            return jsonify({"error": "Registration failed: Unable to connect to authentication service"}), 500
        
        # Check for errors in response
        if hasattr(resp, 'error') and resp.error:
            error_msg = str(resp.error)
            print(f"Supabase signup error: {error_msg}")
            
            # Check if it's a "user already exists" error
            if "already registered" in error_msg.lower() or "user already exists" in error_msg.lower():
                return jsonify({"error": "Email already registered"}), 400
            
            return jsonify({"error": f"Signup failed: {error_msg}"}), 400

        if not hasattr(resp, 'user') or resp.user is None:
            print(f"Signup failed: No user in response. Response: {resp}")
            return jsonify({"error": "Signup failed: No user created"}), 400

        # Create profile record after successful signup
        try:
            profile_data = {
                "id": resp.user.id,
                "username": username,
                "email": email,
                "bio": ""
            }
            
            profile_result = supabase.table("profiles").insert(profile_data).execute()
            
            if not profile_result.data:
                print(f"Warning: Profile creation failed for user {resp.user.id}")
                
        except Exception as profile_error:
            print(f"Profile creation error: {profile_error}")

        print(f"Registration successful for user {resp.user.id}")
        return jsonify({
            "message": "Registered successfully. Check your email.",
            "user_id": resp.user.id,
            "username": username
        }), 201
    except Exception as e:
        error_str = str(e).lower()
        print(f"Register error: {e}")
        
        # Handle specific error cases
        if "already registered" in error_str or "user already exists" in error_str:
            return jsonify({"error": "Email already registered"}), 400
        
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        body = request.get_json()
        if not body:
            return jsonify({"error": "Request body is required"}), 400
    except Exception:
        return jsonify({"error": "Request body is required"}), 400
    
    try:
        email = body.get("email")
        password = body.get("password")
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        def login_call():
            return supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
        
        resp = retry_supabase_auth_call(login_call)
        
        # Check if response has errors
        if hasattr(resp, 'error') and resp.error:
            return jsonify({"error": "Invalid credentials"}), 401

        session = getattr(resp, "session", None)
        if not session:
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify({
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "user_id": resp.user.id
        })
    except Exception as e:
        print(f"Login error: {e}")
        # Check if error is about invalid credentials
        if "Invalid" in str(e) or "credentials" in str(e).lower():
            return jsonify({"error": "Invalid credentials"}), 401
        return jsonify({"error": f"Login failed: {str(e)}"}), 500


@auth_bp.route("/profile", methods=["GET"])
def get_profile():
    user_id = get_user_id_from_token(request)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        # Get user info from Supabase Auth to access user metadata
        def auth_call():
            auth_header = request.headers.get("Authorization")
            token = auth_header.split(" ")[1]
            return supabase.auth.get_user(token)
        
        response = retry_supabase_auth_call(auth_call)
        if response and response.user:
            user_metadata = response.user.user_metadata or {}
        else:
            return jsonify({"error": "Unauthorized"}), 401
    except Exception as e:
        print(f"JWT verification error: {e}")
        return jsonify({"error": "Unauthorized"}), 401

    # Get profile data from profiles table
    data = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    
    if data.data:
        profile = data.data
        
        # Get first and last name from user metadata (stored during registration)
        firstName = user_metadata.get("firstName", "")
        lastName = user_metadata.get("lastName", "")
        
        # Convert backend field names to frontend expected names
        profile_response = {
            "id": profile.get("id"),
            "firstName": firstName,
            "lastName": lastName,
            "email": profile.get("email", ""),
            "username": profile.get("username", ""),
            "createdAt": profile.get("created_at", ""),
            "profile_pic_url": profile.get("profile_pic_url"),
            "profile_pic_path": profile.get("profile_pic_path")
        }
        
        return jsonify(profile_response)
    else:
        return jsonify({"error": "Profile not found"}), 404

@auth_bp.route("/profile", methods=["PUT"])
def update_profile():
    # Profile editing is disabled - only profile picture uploads are allowed
    return jsonify({"error": "Profile editing is disabled. Only profile picture uploads are allowed."}), 403

@auth_bp.route("/check-username", methods=["POST"])
def check_username():
    body = request.get_json()
    username = body.get("username")

    if not username:
        return jsonify({"error": "Username is required"}), 400

    try:
        existing_user = supabase.table("profiles").select("username").eq("username", username).execute()
        if existing_user.data:
            return jsonify({"available": False, "message": "Username already taken"}), 200
        else:
            return jsonify({"available": True, "message": "Username is available"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to check username: {str(e)}"}), 500

@auth_bp.route("/profile/upload-pic", methods=["POST"])
def upload_profile_pic():
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Check file type
    allowed_types = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
    if file.content_type not in allowed_types:
        return jsonify({"error": "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed"}), 400

    # Check file size (max 5MB)
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    if file_size > 5 * 1024 * 1024:  # 5MB
        return jsonify({"error": "File too large. Maximum size is 5MB"}), 400

    try:
        # Read file data as bytes
        file_data = file.read()
        
        # Convert to base64 for storage
        import base64
        file_data_base64 = base64.b64encode(file_data).decode('utf-8')
        
        # Update profile with base64 encoded image data
        result = supabase.table("profiles").update({
            "profile_pic": file_data_base64,
            "profile_pic_type": file.content_type
        }).eq("id", user_id).execute()
        
        if result.data:
            return jsonify({
                "message": "Profile picture uploaded successfully",
                "profile_pic_type": file.content_type,
                "profile_pic_size": len(file_data)
            }), 200
        else:
            return jsonify({"error": "Failed to update profile"}), 500
            
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@auth_bp.route("/profile/pic/<user_id>", methods=["GET"])
def get_profile_pic(user_id):
    try:
        # Get profile picture data
        result = supabase.table("profiles").select("profile_pic, profile_pic_type").eq("id", user_id).single().execute()
        
        if not result.data or not result.data.get("profile_pic"):
            return jsonify({"error": "Profile picture not found"}), 404
        
        # Decode base64 image data
        import base64
        pic_data_base64 = result.data["profile_pic"]
        pic_type = result.data.get("profile_pic_type", "image/jpeg")
        
        # Decode base64 to bytes
        pic_data = base64.b64decode(pic_data_base64)
        
        # Return the image data
        from flask import Response
        return Response(pic_data, mimetype=pic_type)
        
    except Exception as e:
        print(f"Get profile pic error: {e}")
        return jsonify({"error": f"Failed to get profile picture: {str(e)}"}), 500

@auth_bp.route("/logout", methods=["POST"])
def logout():
    try:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # Sign out the user from Supabase
                supabase.auth.sign_out(token)
            except Exception as e:
                print(f"Supabase logout error: {e}")
                # Continue with logout even if Supabase call fails
        
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception as e:
        print(f"Logout error: {e}")
        return jsonify({"message": "Logged out successfully"}), 200