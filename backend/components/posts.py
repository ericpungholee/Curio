from flask import Blueprint, request, jsonify
from .common import supabase, get_user_id_from_token, create_user_supabase_client
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
        
        # Revert to service role approach - this will work
        # The service role bypasses RLS and we're manually setting author_id
        print(f"Creating post for user_id: {user_id}")
        print(f"Post data: {post_data}")
        
        result = supabase.table("posts").insert(post_data).execute()
        print(f"Post insertion result: {result}")
        
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
        
        # Get current user ID for like status
        user_id = get_user_id_from_token(request)
        
        # Get comments and like information for each post
        for post in posts:
            # Get comments
            try:
                comments_result = supabase.table("comments").select(
                    "*, profiles!author_id(username)"
                ).eq("post_id", post["id"]).order("created_at", desc=False).execute()
                
                comments = comments_result.data if comments_result.data else []
                
                # Add like information to each comment
                for comment in comments:
                    try:
                        comment_likes_result = supabase.table("comment_likes").select("id").eq("comment_id", comment["id"]).execute()
                        comment["likes_count"] = len(comment_likes_result.data) if comment_likes_result.data else 0
                        
                        if user_id:
                            user_comment_like = supabase.table("comment_likes").select("id").eq("comment_id", comment["id"]).eq("user_id", user_id).execute()
                            comment["is_liked"] = len(user_comment_like.data) > 0 if user_comment_like.data else False
                        else:
                            comment["is_liked"] = False
                    except Exception as e:
                        comment["likes_count"] = 0
                        comment["is_liked"] = False
                
                post["comments"] = comments
            except Exception as e:
                print(f"Error fetching comments for post {post['id']}: {e}")
                post["comments"] = []
            
            # Get like count (with error handling)
            try:
                likes_result = supabase.table("post_likes").select("id").eq("post_id", post["id"]).execute()
                post["likes_count"] = len(likes_result.data) if likes_result.data else 0
            except Exception as e:
                print(f"Error fetching likes for post {post['id']}: {e}")
                post["likes_count"] = 0
            
            # Check if current user liked this post (with error handling)
            try:
                if user_id:
                    user_like_result = supabase.table("post_likes").select("id").eq("post_id", post["id"]).eq("user_id", user_id).execute()
                    post["is_liked"] = len(user_like_result.data) > 0 if user_like_result.data else False
                else:
                    post["is_liked"] = False
            except Exception as e:
                print(f"Error checking user like for post {post['id']}: {e}")
                post["is_liked"] = False
        
        return jsonify({"posts": posts}), 200
    except Exception as e:
        print(f"Error getting posts: {e}")
        return jsonify({"error": f"Failed to get posts: {str(e)}"}), 500

@posts_bp.route("/my-posts", methods=["GET"])
def get_my_posts():
    """Get the current user's posts ordered by date (newest first)"""
    print("=== MY-POSTS ENDPOINT CALLED ===")
    print("Request headers:", dict(request.headers))
    
    user_id = get_user_id_from_token(request)
    print(f"Extracted user_id: {user_id}")
    
    if not user_id:
        print("Unauthorized: No user_id found")
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        print(f"Fetching posts for user_id: {user_id}")
        
        # Query posts table with like information
        result = supabase.table("posts").select(
            "id, title, content, image_url, created_at, author_id"
        ).eq("author_id", user_id).order("created_at", desc=True).execute()
        
        print(f"Query result: {result}")
        print(f"Posts found: {len(result.data) if result.data else 0}")
        
        posts = result.data if result.data else []
        
        # Add like information for each post
        for post in posts:
            # Get like count (with error handling)
            try:
                likes_result = supabase.table("post_likes").select("id").eq("post_id", post["id"]).execute()
                post["likes_count"] = len(likes_result.data) if likes_result.data else 0
            except Exception as e:
                print(f"Error fetching likes for post {post['id']}: {e}")
                post["likes_count"] = 0
            
            # Check if current user liked this post (with error handling)
            try:
                user_like_result = supabase.table("post_likes").select("id").eq("post_id", post["id"]).eq("user_id", user_id).execute()
                post["is_liked"] = len(user_like_result.data) > 0 if user_like_result.data else False
            except Exception as e:
                print(f"Error checking user like for post {post['id']}: {e}")
                post["is_liked"] = False
        
        print(f"Final posts with like info: {posts}")
        return jsonify({"posts": posts}), 200
    except Exception as e:
        print(f"Error getting user posts: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to get user posts: {str(e)}"}), 500

@posts_bp.route("/delete-post/<post_id>", methods=["DELETE"])
def delete_post(post_id):
    """Delete a post (only by author)"""
    user_id = get_user_id_from_token(request)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        # Check if post exists and user is the author
        post = supabase.table("posts").select("*").eq("id", post_id).execute()
        
        if not post.data:
            return jsonify({"error": "Post not found"}), 404
        
        if post.data[0]["author_id"] != user_id:
            return jsonify({"error": "Not authorized to delete this post"}), 403
        
        supabase.table("posts").delete().eq("id", post_id).execute()
        return jsonify({"message": "Post deleted"}), 200
    except Exception as e:
        print(f"Error deleting post: {e}")
        return jsonify({"error": f"Failed to delete post: {str(e)}"}), 500

@posts_bp.route("/like-post/<post_id>", methods=["POST"])
def like_post(post_id):
    """Like or unlike a post (users can like their own posts)"""
    print("=== LIKE POST ENDPOINT CALLED ===")
    print(f"Request headers: {dict(request.headers)}")
    
    user_id = get_user_id_from_token(request)
    if not user_id:
        print("ERROR: Could not get user_id from token")
        print(f"Authorization header: {request.headers.get('Authorization')}")
        return jsonify({"error": "Unauthorized"}), 401
    
    print(f"Attempting to like post {post_id} for user {user_id}")
    print(f"Supabase client type: {type(supabase)}")
    
    try:
        # Check if user already liked the post
        print("Checking for existing like...")
        existing_like = supabase.table("post_likes").select("*").eq("post_id", post_id).eq("user_id", user_id).execute()
        print(f"Existing like result: {existing_like.data}")
        
        if existing_like.data:
            # Unlike the post
            supabase.table("post_likes").delete().eq("post_id", post_id).eq("user_id", user_id).execute()
            return jsonify({"message": "Post unliked", "liked": False}), 200
        else:
            # Like the post - users can like their own posts
            # The service role client bypasses RLS, so we can insert directly
            supabase.table("post_likes").insert({
                "post_id": post_id,
                "user_id": user_id
            }).execute()
            return jsonify({"message": "Post liked", "liked": True}), 200
    except Exception as e:
        print(f"Error liking post: {e}")
        print(f"Post ID: {post_id}, User ID: {user_id}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to like post: {str(e)}"}), 500

# COMMENT ENDPOINTS
@posts_bp.route("/comment/<post_id>", methods=["POST"])
def create_comment(post_id):
    """Create a comment on a post"""
    user_id = get_user_id_from_token(request)
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
            # Fetch the comment with profile information using the correct relationship
            comment_id = result.data[0]["id"]
            comment_with_profile = supabase.table("comments").select(
                "*, profiles!author_id(username)"
            ).eq("id", comment_id).single().execute()
            
            if comment_with_profile.data:
                return jsonify({"comment": comment_with_profile.data}), 201
            else:
                return jsonify({"comment": result.data[0]}), 201
        else:
            return jsonify({"error": "Failed to create comment"}), 500
    except Exception as e:
        print(f"Error creating comment: {e}")
        return jsonify({"error": f"Failed to create comment: {str(e)}"}), 500

@posts_bp.route("/comment/<comment_id>", methods=["DELETE"])
def delete_comment(comment_id):
    """Delete a comment (only by author)"""
    user_id = get_user_id_from_token(request)
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
    user_id = get_user_id_from_token(request)
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
        
        # Get like information (with error handling)
        try:
            likes_result = supabase.table("post_likes").select("id").eq("post_id", post_id).execute()
            post["likes_count"] = len(likes_result.data) if likes_result.data else 0
        except Exception as e:
            print(f"Error fetching likes for post {post_id}: {e}")
            post["likes_count"] = 0
        
        # Check if current user liked this post (if user is authenticated)
        user_id = get_user_id_from_token(request)
        try:
            if user_id:
                user_like_result = supabase.table("post_likes").select("id").eq("post_id", post_id).eq("user_id", user_id).execute()
                post["is_liked"] = len(user_like_result.data) > 0 if user_like_result.data else False
            else:
                post["is_liked"] = False
        except Exception as e:
            print(f"Error checking user like for post {post_id}: {e}")
            post["is_liked"] = False
        
        # Get comments for this post
        comments_result = supabase.table("comments").select(
            "*, profiles!author_id(username)"
        ).eq("post_id", post_id).order("created_at", desc=False).execute()
        
        comments = comments_result.data if comments_result.data else []
        
        # Add like information to each comment
        for comment in comments:
            try:
                # Get like count
                comment_likes_result = supabase.table("comment_likes").select("id").eq("comment_id", comment["id"]).execute()
                comment["likes_count"] = len(comment_likes_result.data) if comment_likes_result.data else 0
                
                # Check if current user liked this comment
                if user_id:
                    user_comment_like = supabase.table("comment_likes").select("id").eq("comment_id", comment["id"]).eq("user_id", user_id).execute()
                    comment["is_liked"] = len(user_comment_like.data) > 0 if user_comment_like.data else False
                else:
                    comment["is_liked"] = False
            except Exception as e:
                print(f"Error fetching comment like info for comment {comment['id']}: {e}")
                comment["likes_count"] = 0
                comment["is_liked"] = False
        
        post["comments"] = comments
        
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