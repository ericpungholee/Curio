from flask import Blueprint, request, jsonify
from .common import supabase, get_user_id_from_token

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
        
        if not title or not content:
            return jsonify({"error": "Title and content are required"}), 400
        
        result = supabase.table("posts").insert({
            "author_id": user_id,
            "title": title,
            "content": content
        }).execute()
        
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