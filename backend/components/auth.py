from flask import Blueprint, request, jsonify
from supabase import create_client, Client
import os
import jwt

auth_bp = Blueprint("auth", __name__)

# Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_user_id_from_token():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    try:
        # Use Supabase's built-in JWT verification
        response = supabase.auth.get_user(token)
        if response.user:
            return response.user.id
    except Exception as e:
        print(f"JWT verification error: {e}")
        return None
    return None


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        body = request.get_json()
        if not body:
            return jsonify({"error": "Request body is required"}), 400
    except Exception as e:
        if "Content-Type" in str(e):
            return jsonify({"error": "Request body is required"}), 400
        return jsonify({"error": "Request body is required"}), 400
    
    try:
        email = body.get("email")
        password = body.get("password")
        username = body.get("username")

        if not email or not password or not username:
            return jsonify({"error": "Email, password, and username are required"}), 400

        # Check if username already exists
        try:
            existing_user = supabase.table("profiles").select("username").eq("username", username).execute()
            if existing_user.data:
                return jsonify({"error": "Username already taken"}), 400
        except Exception as e:
            print(f"Error checking username: {e}")

        # Register user with Supabase Auth
        resp = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "username": username
                }
            }
        })
        
        # Check for errors in response
        if hasattr(resp, 'error') and resp.error:
            return jsonify({"error": f"Signup failed: {resp.error}"}), 400

        if resp.user is None:
            return jsonify({"error": "Signup failed"}), 400

        return jsonify({
            "message": "Registered successfully. Check your email.",
            "user_id": resp.user.id,
            "username": username
        }), 201
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        body = request.get_json()
        if not body:
            return jsonify({"error": "Request body is required"}), 400
    except Exception as e:
        if "Content-Type" in str(e):
            return jsonify({"error": "Request body is required"}), 400
        return jsonify({"error": "Request body is required"}), 400
    
    try:
        email = body.get("email")
        password = body.get("password")
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        resp = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
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
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    return jsonify(data.data)

@auth_bp.route("/profile", methods=["PUT"])
def update_profile():
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    body = request.get_json()
    username = body.get("username")
    bio = body.get("bio")

    # If username is being updated, check if it's unique
    if username:
        try:
            existing_user = supabase.table("profiles").select("username").eq("username", username).neq("id", user_id).execute()
            if existing_user.data:
                return jsonify({"error": "Username already taken"}), 400
        except Exception as e:
            print(f"Error checking username: {e}")
            return jsonify({"error": "Failed to check username availability"}), 500

    # Update profile
    update_data = {}
    if username:
        update_data["username"] = username
    if bio is not None:
        update_data["bio"] = bio

    if update_data:
        result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        if result.data:
            return jsonify({"message": "Profile updated successfully", "profile": result.data[0]})
        else:
            return jsonify({"error": "Failed to update profile"}), 500
    else:
        return jsonify({"error": "No fields to update"}), 400

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
        
        # Update profile with binary image data
        result = supabase.table("profiles").update({
            "profile_pic": file_data,
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
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@auth_bp.route("/profile/pic/<user_id>", methods=["GET"])
def get_profile_pic(user_id):
    try:
        # Get profile picture data
        result = supabase.table("profiles").select("profile_pic, profile_pic_type").eq("id", user_id).single().execute()
        
        if not result.data or not result.data.get("profile_pic"):
            return jsonify({"error": "Profile picture not found"}), 404
        
        # Convert bytea to bytes
        import base64
        pic_data = result.data["profile_pic"]
        pic_type = result.data.get("profile_pic_type", "image/jpeg")
        
        # Return the image data
        from flask import Response
        return Response(pic_data, mimetype=pic_type)
        
    except Exception as e:
        return jsonify({"error": f"Failed to get profile picture: {str(e)}"}), 500

@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"message": "Logout handled client-side by deleting token"})
