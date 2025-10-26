from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

# Configure CORS - allow all origins to support Vercel deployments
# This allows the frontend from any domain to access the API
CORS(app,
     origins="*",  # Allow all origins for Vercel preview deployments
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     supports_credentials=False)

# Configure file upload settings
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configure request timeout
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Register blueprints
from components.auth import auth_bp
from components.posts import posts_bp
from components.storage import storage_bp
from components.graph_search import graph_search_bp
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(posts_bp, url_prefix="/api/post")
app.register_blueprint(storage_bp, url_prefix="/api/storage")
app.register_blueprint(graph_search_bp, url_prefix="/api/graph")

@app.route("/health")
def health():
    return {"status": "running", "message": "Curio backend is healthy"}

@app.route("/")
def root():
    return {"message": "Curio Backend API", "endpoints": ["/api/auth", "/api/post", "/api/storage", "/health"]}

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
