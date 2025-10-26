from flask import Blueprint, request, jsonify
from .common import supabase, get_user_id_from_token
import os

posts_bp = Blueprint("posts", __name__)

# POST ENDPOINTS
@posts_bp.route("/create-post", methods=["POST"])
def create_post():
    """Create a new post"""
    # Get the current logged-in user's ID
    user_id = get_user_id_from_token(request)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        body = request.get_json()
        if not body:
            return jsonify({"error": "Request body is required"}), 400
        
        title = body.get("title")
        content = body.get("content")
        image_url = body.get("image_url")  # Optional image URL
        
        if not title or not content:
            return jsonify({"error": "Title and content are required"}), 400
        
        post_data = {
            "author_id": user_id,
            "title": title,
            "content": content
        }
        
        # Add image URL if provided
        if image_url:
            post_data["image_url"] = image_url
        
        result = supabase.table("posts").insert(post_data).execute()
        
        if result.data:
            return jsonify({"post": result.data[0]}), 201
        else:
            return jsonify({"error": "Failed to create post"}), 500
    except Exception as e:
        print(f"Error creating post: {e}")
        return jsonify({"error": f"Failed to create post: {str(e)}"}), 500

@posts_bp.route("/get-posts", methods=["GET"])
def get_posts():
    """Get all posts with comments and author info"""
    try:
        result = supabase.table("posts").select(
            "*, author_id, profiles!inner(username, email)"
        ).order("created_at", desc=True).execute()
        
        posts = result.data if result.data else []
        
        # Get comments for each post
        for post in posts:
            comments_result = supabase.table("comments").select(
                "*, author_id, profiles!inner(username)"
            ).eq("post_id", post["id"]).order("created_at", desc=False).execute()
            
            post["comments"] = comments_result.data if comments_result.data else []
        
        return jsonify({"posts": posts}), 200
    except Exception as e:
        print(f"Error getting posts: {e}")
        return jsonify({"error": f"Failed to get posts: {str(e)}"}), 500

@posts_bp.route("/like-post/<post_id>", methods=["POST"])
def like_post(post_id):
    """Like or unlike a post"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        # Check if user already liked the post
        existing_like = supabase.table("post_likes").select("*").eq("post_id", post_id).eq("user_id", user_id).execute()
        
        if existing_like.data:
            # Unlike the post
            supabase.table("post_likes").delete().eq("post_id", post_id).eq("user_id", user_id).execute()
            return jsonify({"message": "Post unliked", "liked": False}), 200
        else:
            # Like the post
            supabase.table("post_likes").insert({
                "post_id": post_id,
                "user_id": user_id
            }).execute()
            return jsonify({"message": "Post liked", "liked": True}), 200
    except Exception as e:
        print(f"Error liking post: {e}")
        return jsonify({"error": f"Failed to like post: {str(e)}"}), 500

# COMMENT ENDPOINTS
@posts_bp.route("/comment/<post_id>", methods=["POST"])
def create_comment(post_id):
    """Create a comment on a post"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        body = request.get_json()
        if not body:
            return jsonify({"error": "Request body is required"}), 400
        
        content = body.get("content")
        if not content:
            return jsonify({"error": "Content is required"}), 400
        
        result = supabase.table("comments").insert({
            "post_id": post_id,
            "author_id": user_id,
            "content": content
        }).execute()
        
        if result.data:
            return jsonify({"comment": result.data[0]}), 201
        else:
            return jsonify({"error": "Failed to create comment"}), 500
    except Exception as e:
        print(f"Error creating comment: {e}")
        return jsonify({"error": f"Failed to create comment: {str(e)}"}), 500

@posts_bp.route("/comment/<comment_id>", methods=["DELETE"])
def delete_comment(comment_id):
    """Delete a comment (only by author)"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        # Check if comment exists and user is the author
        comment = supabase.table("comments").select("*").eq("id", comment_id).execute()
        
        if not comment.data:
            return jsonify({"error": "Comment not found"}), 404
        
        if comment.data[0]["author_id"] != user_id:
            return jsonify({"error": "Not authorized to delete this comment"}), 403
        
        supabase.table("comments").delete().eq("id", comment_id).execute()
        return jsonify({"message": "Comment deleted"}), 200
    except Exception as e:
        print(f"Error deleting comment: {e}")
        return jsonify({"error": f"Failed to delete comment: {str(e)}"}), 500

@posts_bp.route("/like-comment/<comment_id>", methods=["POST"])
def like_comment(comment_id):
    """Like or unlike a comment"""
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        # Check if user already liked the comment
        existing_like = supabase.table("comment_likes").select("*").eq("comment_id", comment_id).eq("user_id", user_id).execute()
        
        if existing_like.data:
            # Unlike the comment
            supabase.table("comment_likes").delete().eq("comment_id", comment_id).eq("user_id", user_id).execute()
            return jsonify({"message": "Comment unliked", "liked": False}), 200
        else:
            # Like the comment
            supabase.table("comment_likes").insert({
                "comment_id": comment_id,
                "user_id": user_id
            }).execute()
            return jsonify({"message": "Comment liked", "liked": True}), 200
    except Exception as e:
        print(f"Error liking comment: {e}")
        return jsonify({"error": f"Failed to like comment: {str(e)}"}), 500

@posts_bp.route("/post/<post_id>", methods=["GET"])
def get_post(post_id):
    """Get a single post with comments"""
    try:
        result = supabase.table("posts").select(
            "*, author_id, profiles!inner(username, email)"
        ).eq("id", post_id).single().execute()
        
        if not result.data:
            return jsonify({"error": "Post not found"}), 404
        
        post = result.data
        
        # Get comments for this post
        comments_result = supabase.table("comments").select(
            "*, author_id, profiles!inner(username)"
        ).eq("post_id", post_id).order("created_at", desc=False).execute()
        
        post["comments"] = comments_result.data if comments_result.data else []
        
        return jsonify({"post": post}), 200
    except Exception as e:
        print(f"Error getting post: {e}")
        return jsonify({"error": f"Failed to get post: {str(e)}"}), 500

@posts_bp.route("/upload-image", methods=["POST"])
def upload_post_image():
    """Upload an image for a post"""
    user_id = get_user_id_from_token(request)
    if not user_id:
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
        
        # Validate file size (5MB max)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            return jsonify({"error": "File too large. Maximum size is 5MB."}), 400
        
        # Read file data
        file_data = file.read()
        
        # Create user-specific filename with timestamp
        import time
        timestamp = int(time.time())
        file_extension = os.path.splitext(file.filename)[1]
        file_name = f"post-images/{user_id}_{timestamp}{file_extension}"
        
        # Upload to post images bucket
        try:
            file_options = {"content-type": file.content_type}
            upload_response = supabase.storage.from_("post-images").upload(
                path=file_name,
                file=file_data,
                file_options=file_options
            )
            
            # Get public URL for the uploaded image
            public_url = supabase.storage.from_("post-images").get_public_url(file_name)
            
            return jsonify({
                "message": "Image uploaded successfully",
                "image_url": public_url,
                "file_name": file_name,
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
        print(f"Post image upload endpoint error: {e}")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500