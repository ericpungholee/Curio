from flask_restx import Namespace, Resource, fields
from flask import request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from db.supabase_client import supabase_client, require_auth
from datetime import datetime

posts_ns = Namespace('posts', description='Post operations')

# Request/Response models
post_model = posts_ns.model('Post', {
    'id': fields.String(description='Post ID'),
    'author_id': fields.String(description='Author user ID'),
    'content': fields.String(description='Post content'),
    'created_at': fields.String(description='Creation timestamp'),
    'author': fields.Nested(posts_ns.model('Author', {
        'id': fields.String(description='Author ID'),
        'username': fields.String(description='Author username'),
        'bio': fields.String(description='Author bio')
    }))
})

create_post_model = posts_ns.model('CreatePost', {
    'content': fields.String(required=True, description='Post content (max 280 characters)')
})

post_list_model = posts_ns.model('PostList', {
    'posts': fields.List(fields.Nested(post_model)),
    'total': fields.Integer(description='Total number of posts'),
    'page': fields.Integer(description='Current page'),
    'per_page': fields.Integer(description='Posts per page'),
    'has_next': fields.Boolean(description='Has next page')
})

@posts_ns.route('')
class Posts(Resource):
    @require_auth
    @posts_ns.expect(create_post_model)
    @posts_ns.marshal_with(post_model)
    def post(self):
        """Create a new post"""
        data = request.get_json()
        content = data.get('content', '').strip()
        author_id = request.current_user['id']
        
        if not content:
            return {'error': 'Post content is required'}, 400
        
        if len(content) > 280:
            return {'error': 'Post content exceeds 280 character limit'}, 400
        
        try:
            # Create post
            client = supabase_client.service_client or supabase_client.client
            response = client.table('posts').insert({
                'author_id': author_id,
                'content': content,
                'created_at': 'now()'
            }).execute()
            
            if response.data:
                post = response.data[0]
                # Get author info
                author_profile = supabase_client.get_user_profile(author_id)
                post['author'] = {
                    'id': author_profile['id'],
                    'username': author_profile['username'],
                    'bio': author_profile.get('bio', '')
                }
                return post
            else:
                return {'error': 'Failed to create post'}, 500
                
        except Exception as e:
            return {'error': f'Failed to create post: {str(e)}'}, 500

@posts_ns.route('/latest')
class LatestPosts(Resource):
    @posts_ns.marshal_with(post_list_model)
    def get(self):
        """Get latest posts (global feed)"""
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 50)  # Max 50 per page
        offset = (page - 1) * per_page
        
        try:
            # Get posts with author info
            client = supabase_client.service_client or supabase_client.client
            response = client.table('posts').select(
                '*, profiles!posts_author_id_fkey(username, bio)'
            ).order('created_at', desc=True).range(offset, offset + per_page - 1).execute()
            
            posts = []
            for post in response.data:
                post['author'] = {
                    'id': post['author_id'],
                    'username': post['profiles']['username'],
                    'bio': post['profiles'].get('bio', '')
                }
                del post['profiles']  # Remove the nested profiles object
                posts.append(post)
            
            # Get total count
            count_response = client.table('posts').select('id', count='exact').execute()
            total = count_response.count if hasattr(count_response, 'count') else len(posts)
            
            return {
                'posts': posts,
                'total': total,
                'page': page,
                'per_page': per_page,
                'has_next': offset + per_page < total
            }
            
        except Exception as e:
            return {'error': f'Failed to fetch posts: {str(e)}'}, 500

@posts_ns.route('/<string:post_id>')
class Post(Resource):
    @posts_ns.marshal_with(post_model)
    def get(self, post_id):
        """Get a specific post by ID"""
        try:
            client = supabase_client.service_client or supabase_client.client
            response = client.table('posts').select(
                '*, profiles!posts_author_id_fkey(username, bio)'
            ).eq('id', post_id).execute()
            
            if response.data:
                post = response.data[0]
                post['author'] = {
                    'id': post['author_id'],
                    'username': post['profiles']['username'],
                    'bio': post['profiles'].get('bio', '')
                }
                del post['profiles']
                return post
            else:
                return {'error': 'Post not found'}, 404
                
        except Exception as e:
            return {'error': f'Failed to fetch post: {str(e)}'}, 500
    
    @require_auth
    def delete(self, post_id):
        """Delete a post (only by author)"""
        try:
            # First check if post exists and get author
            client = supabase_client.service_client or supabase_client.client
            post_response = client.table('posts').select('author_id').eq('id', post_id).execute()
            
            if not post_response.data:
                return {'error': 'Post not found'}, 404
            
            post_author_id = post_response.data[0]['author_id']
            current_user_id = request.current_user['id']
            
            # Check if current user is the author
            if post_author_id != current_user_id:
                return {'error': 'Unauthorized: You can only delete your own posts'}, 403
            
            # Delete the post
            delete_response = client.table('posts').delete().eq('id', post_id).execute()
            
            if delete_response.data:
                return {'message': 'Post deleted successfully'}
            else:
                return {'error': 'Failed to delete post'}, 500
                
        except Exception as e:
            return {'error': f'Failed to delete post: {str(e)}'}, 500

@posts_ns.route('/user/<string:user_id>')
class UserPosts(Resource):
    @posts_ns.marshal_with(post_list_model)
    def get(self, user_id):
        """Get posts by a specific user"""
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 50)
        offset = (page - 1) * per_page
        
        try:
            # Get user's posts
            client = supabase_client.service_client or supabase_client.client
            response = client.table('posts').select(
                '*, profiles!posts_author_id_fkey(username, bio)'
            ).eq('author_id', user_id).order('created_at', desc=True).range(offset, offset + per_page - 1).execute()
            
            posts = []
            for post in response.data:
                post['author'] = {
                    'id': post['author_id'],
                    'username': post['profiles']['username'],
                    'bio': post['profiles'].get('bio', '')
                }
                del post['profiles']
                posts.append(post)
            
            # Get total count for this user
            count_response = client.table('posts').select('id', count='exact').eq('author_id', user_id).execute()
            total = count_response.count if hasattr(count_response, 'count') else len(posts)
            
            return {
                'posts': posts,
                'total': total,
                'page': page,
                'per_page': per_page,
                'has_next': offset + per_page < total
            }
            
        except Exception as e:
            return {'error': f'Failed to fetch user posts: {str(e)}'}, 500
