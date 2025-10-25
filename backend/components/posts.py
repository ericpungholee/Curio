from flask import Blueprint, request, jsonify
from .auth import supabase, get_user_id_from_token

posts_bp = Blueprint("posts", __name__)

@posts_bp.route("/create-post", methods=["POST"])
def create_post():
    # Get the current logged-in user's ID
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    body = request.get_json()
    
    result = supabase.table("posts").insert({
        "author_id": user_id,
        "title": body.get("title", "Default Title"),
        "content": body.get("content", "Default Content"),
        "likes": 0
    }).execute()

    return jsonify({"post": result.data[0]}), 201