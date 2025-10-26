"""Graph search functionality for semantic search and knowledge graphs"""
from flask import Blueprint, request, jsonify
from .common import supabase, get_user_id_from_token
from .embedding_utils import (
    get_openai_embedding, 
    cosine_similarity, 
    parse_embedding,
    get_openai_client
)
import numpy as np

graph_search_bp = Blueprint("graph_search", __name__)

# Initialize OpenAI client for LLM operations
openai_client = None
try:
    openai_client = get_openai_client()
    if openai_client and openai_client != "unavailable":
        print("✓ OpenAI client initialized for LLM operations")
    else:
        print("⚠ OpenAI client not available - LLM features will not work")
except Exception as e:
    print(f"Error initializing OpenAI client: {e}")

def get_relationship_description(post1_text: str, post2_text: str, similarity: float) -> str:
    """Generate relationship description using LLM"""
    if openai_client and similarity > 0.5:
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that explains relationships between content pieces concisely."
                    },
                    {
                        "role": "user",
                        "content": f"Post 1: {post1_text[:200]}\n\nPost 2: {post2_text[:200]}\n\nExplain the relationship between these two posts in one sentence:"
                    }
                ],
                max_tokens=50
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error generating LLM description: {e}")
    
    # Fallback to similarity-based description
    if similarity > 0.7:
        return "High similarity - Very related topics"
    elif similarity > 0.5:
        return "Moderate similarity - Related concepts"
    else:
        return "Low similarity - Slightly related"

@graph_search_bp.route("/semantic-search", methods=["POST"])
def semantic_search():
    """
    Semantic search endpoint that finds similar posts using vector similarity
    and generates a knowledge graph with edges between related posts.
    """
    try:
        body = request.get_json()
        if not body:
            return jsonify({"error": "Request body is required"}), 400
        
        query = body.get("query", "")
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        # Configurable parameters
        limit = body.get("limit", 50)
        match_threshold = body.get("threshold", 0.60)
        edge_threshold = body.get("edge_threshold", 0.40)  # Lower threshold for more connections
        
        # Generate embedding for the query
        if not openai_client:
            return jsonify({"error": "OpenAI client not initialized"}), 500
        
        query_embedding = get_openai_embedding(query, dimension="small")
        if not query_embedding:
            return jsonify({"error": "Failed to generate query embedding"}), 500
        
        print(f"Generated query embedding for: '{query}' (dimensions: {len(query_embedding)})")
        
        # Search for similar posts using pgvector SQL function
        posts = []
        try:
            result = supabase.rpc(
                'match_posts',
                {
                    'query_embedding': query_embedding,
                    'match_threshold': match_threshold,
                    'match_count': limit
                }
            ).execute()
            
            posts = result.data if result.data else []
            print(f"Found {len(posts)} posts via pgvector search")
        except Exception as rpc_error:
            print(f"RPC call failed: {rpc_error}")
            # Fallback: calculate similarities in Python
            all_posts_result = supabase.table("posts").select(
                "id, title, content, image_url, created_at, author_id, embedding"
            ).not_.is_("embedding", "null").limit(100).execute()
            
            all_posts = all_posts_result.data if all_posts_result.data else []
            
            # Calculate similarities
            for post in all_posts:
                embedding = parse_embedding(post.get('embedding'))
                if embedding:
                    try:
                        similarity = cosine_similarity(query_embedding, embedding)
                        post['similarity_score'] = similarity
                        post['similarity'] = similarity
                    except Exception as e:
                        continue
            
            # Filter by threshold and sort
            posts = sorted(
                [p for p in all_posts if p.get('similarity_score', 0) > match_threshold],
                key=lambda x: x.get('similarity_score', 0),
                reverse=True
            )[:limit]
        
        # Fetch full post data including embeddings
        if posts:
            post_ids = [post["id"] for post in posts]
            
            full_posts_result = supabase.table("posts").select(
                "id, title, content, image_url, created_at, author_id, embedding, profiles!author_id(username, email, profile_pic_url)"
            ).in_("id", post_ids).execute()
            
            full_posts = full_posts_result.data if full_posts_result.data else []
            
            # Merge embeddings and profiles into posts
            posts_dict = {post["id"]: post for post in posts}
            for full_post in full_posts:
                if full_post["id"] in posts_dict:
                    if "embedding" in full_post:
                        posts_dict[full_post["id"]]["embedding"] = full_post["embedding"]
                    if "content" in full_post:
                        posts_dict[full_post["id"]]["content"] = full_post["content"]
                    if "profiles" in full_post:
                        posts_dict[full_post["id"]]["profiles"] = full_post["profiles"]
            
            posts = list(posts_dict.values())
        
        # Fetch profile and like information
        if posts:
            user_id = get_user_id_from_token(request)
            for post in posts:
                try:
                    likes_result = supabase.table("post_likes").select("id").eq("post_id", post["id"]).execute()
                    post["likes_count"] = len(likes_result.data) if likes_result.data else 0
                except Exception as e:
                    post["likes_count"] = 0
                
                try:
                    if user_id:
                        user_like_result = supabase.table("post_likes").select("id").eq("post_id", post["id"]).eq("user_id", user_id).execute()
                        post["is_liked"] = len(user_like_result.data) > 0 if user_like_result.data else False
                    else:
                        post["is_liked"] = False
                except Exception as e:
                    post["is_liked"] = False
        
        # Generate edges
        edges = []
        query_node_id = "query_node"
        
        # Get embeddings for all posts
        post_embeddings = []
        for post in posts:
            embedding = parse_embedding(post.get('embedding'))
            post_embeddings.append(embedding)
        
        # Connect query node to all posts
        if query_embedding:
            for i, post in enumerate(posts):
                if post_embeddings[i]:
                    similarity = cosine_similarity(query_embedding, post_embeddings[i])
                    edges.append({
                        "id": f"e{query_node_id}-{post['id']}",
                        "source": query_node_id,
                        "target": post["id"],
                        "relationship": f"Query: '{query}' matched this post",
                        "similarity": float(similarity)
                    })
        
        # Generate post-to-post edges
        if len(posts) > 1:
            for i in range(len(posts)):
                for j in range(i + 1, len(posts)):
                    if post_embeddings[i] and post_embeddings[j]:
                        similarity = cosine_similarity(post_embeddings[i], post_embeddings[j])
                        
                        print(f"Similarity between post {i} and post {j}: {similarity:.3f} (threshold: {edge_threshold})")
                        
                        if similarity > edge_threshold:
                            post1_text = posts[i].get('content', '')
                            post2_text = posts[j].get('content', '')
                            relationship = get_relationship_description(post1_text, post2_text, similarity)
                            
                            edges.append({
                                "id": f"e{posts[i]['id']}-{posts[j]['id']}",
                                "source": posts[i]["id"],
                                "target": posts[j]["id"],
                                "relationship": relationship,
                                "similarity": float(similarity)
                            })
                            print(f"✓ Added edge between post {posts[i]['id'][:8]}... and post {posts[j]['id'][:8]}...")
                        else:
                            print(f"✗ Skipped edge (similarity {similarity:.3f} <= {edge_threshold})")
        
        # Add query node to posts list
        posts_with_query = [
            {
                "id": query_node_id,
                "title": f"Query: {query}",
                "content": query,
                "is_query": True,
                "image_url": None,
                "created_at": None,
                "author_id": None
            }
        ] + posts
        
        print(f"Generated {len(edges)} total edges")
        
        return jsonify({
            "posts": posts_with_query,
            "edges": edges
        }), 200
        
    except Exception as e:
        print(f"Error in semantic search: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to perform semantic search: {str(e)}"}), 500

@graph_search_bp.route("/graph-data", methods=["GET"])
def get_graph_data():
    """Get all posts formatted for the graph with vector similarity edges"""
    try:
        limit = request.args.get("limit", 50, type=int)
        edge_threshold = request.args.get("edge_threshold", 0.60, type=float)
        
        result = supabase.table("posts").select(
            "id, title, content, image_url, created_at, author_id, embedding, profiles!author_id(username, email, profile_pic_url)"
        ).order("created_at", desc=True).limit(limit).execute()
        
        posts = result.data if result.data else []
        
        # Get current user ID for like status
        user_id = get_user_id_from_token(request)
        
        # Add like information
        for post in posts:
            try:
                likes_result = supabase.table("post_likes").select("id").eq("post_id", post["id"]).execute()
                post["likes_count"] = len(likes_result.data) if likes_result.data else 0
            except Exception as e:
                post["likes_count"] = 0
            
            try:
                if user_id:
                    user_like_result = supabase.table("post_likes").select("id").eq("post_id", post["id"]).eq("user_id", user_id).execute()
                    post["is_liked"] = len(user_like_result.data) > 0 if user_like_result.data else False
                else:
                    post["is_liked"] = False
            except Exception as e:
                post["is_liked"] = False
        
        # Generate edges between posts
        posts_with_embeddings = [post for post in posts if post.get('embedding')]
        edges = []
        
        if len(posts_with_embeddings) > 1:
            for i in range(len(posts_with_embeddings)):
                for j in range(i + 1, len(posts_with_embeddings)):
                    embedding1 = parse_embedding(posts_with_embeddings[i].get('embedding'))
                    embedding2 = parse_embedding(posts_with_embeddings[j].get('embedding'))
                    
                    if embedding1 and embedding2:
                        try:
                            similarity = cosine_similarity(embedding1, embedding2)
                        except Exception as e:
                            continue
                        
                        if similarity > edge_threshold:
                            post1_text = posts_with_embeddings[i].get('content', '')
                            post2_text = posts_with_embeddings[j].get('content', '')
                            relationship = get_relationship_description(post1_text, post2_text, similarity)
                            
                            edges.append({
                                "id": f"e{posts_with_embeddings[i]['id']}-{posts_with_embeddings[j]['id']}",
                                "source": posts_with_embeddings[i]["id"],
                                "target": posts_with_embeddings[j]["id"],
                                "relationship": relationship,
                                "similarity": float(similarity)
                            })
        
        print(f"Returning {len(posts)} posts with {len(edges)} edges")
        
        return jsonify({
            "posts": posts,
            "edges": edges
        }), 200
        
    except Exception as e:
        print(f"Error getting graph data: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to get graph data: {str(e)}"}), 500

@graph_search_bp.route("/relationship-details", methods=["POST"])
def get_relationship_details():
    """Get detailed AI-powered relationship analysis between two posts"""
    try:
        body = request.get_json()
        if not body:
            return jsonify({"error": "Request body is required"}), 400
        
        post1_id = body.get("post1_id")
        post2_id = body.get("post2_id")
        
        if not post1_id or not post2_id:
            return jsonify({"error": "Both post IDs are required"}), 400
        
        # Get the two posts
        post1_result = supabase.table("posts").select(
            "id, title, content, author_id, profiles!author_id(username)"
        ).eq("id", post1_id).single().execute()
        
        post2_result = supabase.table("posts").select(
            "id, title, content, author_id, profiles!author_id(username)"
        ).eq("id", post2_id).single().execute()
        
        if not post1_result.data or not post2_result.data:
            return jsonify({"error": "One or both posts not found"}), 404
        
        post1 = post1_result.data
        post2 = post2_result.data
        
        # Generate AI analysis
        analysis_text = ""
        if openai_client and openai_client != "unavailable":
            try:
                prompt = f"""Analyze the relationship between these two posts. IMPORTANT: Always refer to them as "Post 1" and "Post 2" in your analysis.

Post 1 (by {post1.get('profiles', {}).get('username', 'Unknown')}):
Title: {post1.get('title', 'No title')}
Content: {post1.get('content', '')[:400]}

Post 2 (by {post2.get('profiles', {}).get('username', 'Unknown')}):
Title: {post2.get('title', 'No title')}
Content: {post2.get('content', '')[:400]}

Format your response exactly as:
SIMILARITIES:
• Post 1 and Post 2 both discuss...
• They share...
• Both posts mention...

DIFFERENCES:
• Post 1 focuses on... while Post 2 focuses on...
• Post 1 discusses... whereas Post 2 discusses...
• Post 1 emphasizes... in contrast to Post 2 which emphasizes...

SUMMARY:
Brief summary here (always refer to posts as "Post 1" and "Post 2")."""
                
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that analyzes relationships between content pieces concisely."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=300
                )
                
                analysis_text = response.choices[0].message.content.strip()
            except Exception as e:
                print(f"Error generating AI analysis: {e}")
                analysis_text = "AI analysis unavailable."
        
        return jsonify({
            "post1": {
                "id": post1.get('id'),
                "title": post1.get('title'),
                "content_preview": post1.get('content', '')[:200],
                "username": post1.get('profiles', {}).get('username', 'Unknown'),
                "label": "Post 1"
            },
            "post2": {
                "id": post2.get('id'),
                "title": post2.get('title'),
                "content_preview": post2.get('content', '')[:200],
                "username": post2.get('profiles', {}).get('username', 'Unknown'),
                "label": "Post 2"
            },
            "analysis": analysis_text
        }), 200
        
    except Exception as e:
        print(f"Error getting relationship details: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to get relationship details: {str(e)}"}), 500
