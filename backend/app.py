from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

# Register blueprints
from components.auth import auth_bp
from components.posts import posts_bp
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(posts_bp, url_prefix="/api/post")

@app.route("/health")
def health():
    return {"status": "running"}

if __name__ == "__main__":
    app.run(debug=True, port=5000)
