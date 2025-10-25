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
    body = request.get_json()
    email = body.get("email")
    password = body.get("password")

    if not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    resp = supabase.auth.sign_up({
        "email": email,
        "password": password,
    })

    if resp.user is None:
        return jsonify({"error": "Signup failed"}), 400

    return jsonify({"message": "Registered. Check your email."}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    body = request.get_json()
    email = body.get("email")
    password = body.get("password")

    resp = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })

    session = getattr(resp, "session", None)
    if not session:
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify({
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "user_id": resp.user.id
    })


@auth_bp.route("/profile", methods=["GET"])
def get_profile():
    user_id = get_user_id_from_token()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    return jsonify(data.data)

@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"message": "Logout handled client-side by deleting token"})
