from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

# Configure CORS with more specific settings
CORS(app, 
     origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     supports_credentials=True)

# Configure file upload settings
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configure request timeout
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Register blueprints
from components.auth import auth_bp
from components.posts import posts_bp
from components.storage import storage_bp
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(posts_bp, url_prefix="/api/post")
app.register_blueprint(storage_bp, url_prefix="/api/storage")

@app.route("/health")
def health():
    return {"status": "running", "message": "Curio backend is healthy"}

@app.route("/")
def root():
    return {"message": "Curio Backend API", "endpoints": ["/api/auth", "/api/post", "/api/storage", "/health"]}

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
