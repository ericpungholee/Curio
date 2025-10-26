#!/usr/bin/env python3
"""
Supabase Storage functionality for image uploads
Handles reading image files and uploading them to Supabase Storage buckets
"""

import os
import mimetypes
from flask import Blueprint, request, jsonify
from .common import supabase, retry_supabase_auth_call, get_user_id_from_token

# Create blueprint
storage_bp = Blueprint("storage", __name__)

def read_image_file(image_path):
    """
    Read an image file in binary mode
    
    Args:
        image_path (str): Path to the image file
        
    Returns:
        tuple: (image_data, content_type) or (None, None) if error
    """
    try:
        # Check if file exists
        if not os.path.exists(image_path):
            print(f"File not found: {image_path}")
            return None, None
        
        # Get content type
        content_type, _ = mimetypes.guess_type(image_path)
        if not content_type or not content_type.startswith('image/'):
            print(f"Invalid image file: {image_path}")
            return None, None
        
        # Read file in binary mode
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        print(f"Successfully read image: {image_path} ({len(image_data)} bytes, {content_type})")
        return image_data, content_type
        
    except Exception as e:
        print(f"Error reading image file {image_path}: {e}")
        return None, None

def upload_to_supabase_storage(image_data, file_name, bucket_name, content_type=None):
    """
    Upload image data to Supabase Storage
    
    Args:
        image_data (bytes): Binary image data
        file_name (str): Name/path for the file in storage
        bucket_name (str): Name of the Supabase storage bucket
        content_type (str): MIME type of the image
        
    Returns:
        dict: Upload response or error info
    """
    try:
        # Prepare file options
        file_options = {}
        if content_type:
            file_options["content-type"] = content_type
        
        # Upload to Supabase Storage
        response = supabase.storage.from_(bucket_name).upload(
            path=file_name,
            file=image_data,
            file_options=file_options
        )
        
        print(f"Image uploaded successfully to {bucket_name}/{file_name}")
        return {
            "success": True,
            "response": response,
            "path": file_name,
            "bucket": bucket_name
        }
        
    except Exception as e:
        print(f"Error uploading image to Supabase Storage: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@storage_bp.route("/upload-image-file", methods=["POST"])
def upload_image_file():
    """
    Upload an image file from local filesystem to Supabase Storage
    Expects JSON payload with:
    - image_path: Path to the local image file
    - bucket_name: Supabase storage bucket name
    - file_name: Desired name/path in storage (optional, defaults to filename)
    """
    user_id = get_user_id_from_token(request)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        image_path = data.get("image_path")
        bucket_name = data.get("bucket_name")
        file_name = data.get("file_name")
        
        # Validate required fields
        if not image_path:
            return jsonify({"error": "image_path is required"}), 400
        if not bucket_name:
            return jsonify({"error": "bucket_name is required"}), 400
        
        # Use filename if not provided
        if not file_name:
            file_name = os.path.basename(image_path)
        
        # Read the image file
        image_data, content_type = read_image_file(image_path)
        if not image_data:
            return jsonify({"error": "Failed to read image file"}), 400
        
        # Upload to Supabase Storage
        upload_result = upload_to_supabase_storage(
            image_data=image_data,
            file_name=file_name,
            bucket_name=bucket_name,
            content_type=content_type
        )
        
        if upload_result["success"]:
            return jsonify({
                "message": "Image uploaded successfully",
                "path": upload_result["path"],
                "bucket": upload_result["bucket"],
                "content_type": content_type,
                "file_size": len(image_data)
            }), 200
        else:
            return jsonify({"error": f"Upload failed: {upload_result['error']}"}), 500
            
    except Exception as e:
        print(f"Upload endpoint error: {e}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@storage_bp.route("/upload-profile-pic", methods=["POST"])
def upload_profile_pic():
    """
    Upload a profile picture from FormData to Supabase Storage
    Automatically uses 'profile-pictures' bucket and user-specific naming
    Optimized for better performance
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized"}), 401
    
    token = auth_header.split(" ")[1]
    user_id = None
    
    # Get user ID and create authenticated Supabase client
    try:
        def auth_call():
            return supabase.auth.get_user(token)
        
        response = retry_supabase_auth_call(auth_call)
        if response and response.user:
            user_id = response.user.id
        else:
            return jsonify({"error": "Unauthorized"}), 401
    except Exception as e:
        print(f"JWT verification error: {e}")
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        # Check if file is present in request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            return jsonify({"error": "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."}), 400
        
        # Validate file size (8MB max - increased since we compress on frontend)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > 8 * 1024 * 1024:  # 8MB
            return jsonify({"error": "File too large. Maximum size is 8MB."}), 400
        
        # Read file data in chunks for better memory management
        file_data = file.read()
        
        # Create user-specific filename with timestamp to avoid conflicts
        file_extension = os.path.splitext(file.filename)[1]
        import time
        timestamp = int(time.time())
        file_name = f"profile-pics/{user_id}_{timestamp}{file_extension}"
        
        # Upload to profile pictures bucket
        try:
            # Remove old profile pictures for this user (cleanup)
            try:
                # List existing files for this user
                existing_files = supabase.storage.from_("profile-pictures").list("profile-pics")
                for existing_file in existing_files:
                    if existing_file['name'].startswith(f"{user_id}_"):
                        supabase.storage.from_("profile-pictures").remove([f"profile-pics/{existing_file['name']}"])
            except Exception:
                pass  # Cleanup failed, continue with upload
            
            file_options = {"content-type": file.content_type}
            upload_response = supabase.storage.from_("profile-pictures").upload(
                path=file_name,
                file=file_data,
                file_options=file_options
            )
            
            # Get public URL for the uploaded image
            public_url = supabase.storage.from_("profile-pictures").get_public_url(file_name)
            
            # Update user profile with the new URL (async operation)
            try:
                update_result = supabase.table("profiles").update({
                    "profile_pic_url": public_url,
                    "profile_pic_path": file_name
                }).eq("id", user_id).execute()
                
                if update_result.data:
                    return jsonify({
                        "message": "Profile picture uploaded successfully",
                        "profile_pic_url": public_url,
                        "profile_pic_path": file_name,
                        "content_type": file.content_type,
                        "file_size": file_size
                    }), 200
                else:
                    return jsonify({
                        "message": "File uploaded but profile update failed",
                        "profile_pic_url": public_url,
                        "profile_pic_path": file_name,
                        "content_type": file.content_type,
                        "file_size": file_size
                    }), 200
            except Exception as update_error:
                print(f"Profile update error: {update_error}")
                # Still return success since file was uploaded
                return jsonify({
                    "message": "File uploaded but profile update failed",
                    "profile_pic_url": public_url,
                    "profile_pic_path": file_name,
                    "content_type": file.content_type,
                    "file_size": file_size
                }), 200
                
        except Exception as upload_error:
            print(f"Error uploading file: {upload_error}")
            # Check if it's an RLS error
            if "row-level security" in str(upload_error).lower():
                return jsonify({"error": "Upload failed: Permission denied. Please ensure your user has proper permissions."}), 403
            return jsonify({"error": f"Upload failed: {str(upload_error)}"}), 500
            
    except Exception as e:
        print(f"Profile pic upload endpoint error: {e}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@storage_bp.route("/list-buckets", methods=["GET"])
def list_buckets():
    """List all available Supabase Storage buckets"""
    user_id = get_user_id_from_token(request)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        response = supabase.storage.list_buckets()
        buckets = [bucket.name for bucket in response]
        
        return jsonify({
            "buckets": buckets,
            "count": len(buckets)
        }), 200
        
    except Exception as e:
        print(f"Error listing buckets: {e}")
        return jsonify({"error": f"Failed to list buckets: {str(e)}"}), 500

@storage_bp.route("/list-files/<bucket_name>", methods=["GET"])
def list_files(bucket_name):
    """List files in a specific bucket"""
    user_id = get_user_id_from_token(request)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        response = supabase.storage.from_(bucket_name).list()
        
        return jsonify({
            "bucket": bucket_name,
            "files": response,
            "count": len(response)
        }), 200
        
    except Exception as e:
        print(f"Error listing files in bucket {bucket_name}: {e}")
        return jsonify({"error": f"Failed to list files: {str(e)}"}), 500
