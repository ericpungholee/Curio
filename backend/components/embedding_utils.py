"""Embedding utilities for generating and working with OpenAI embeddings"""
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI client
_openai_client = None

def get_openai_client():
    """Get or initialize OpenAI client"""
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            try:
                _openai_client = OpenAI(api_key=api_key)
                print("✓ OpenAI client initialized")
            except Exception as e:
                print(f"✗ Failed to initialize OpenAI client: {e}")
                _openai_client = "unavailable"
        else:
            print("⚠ No OPENAI_API_KEY found in environment")
            _openai_client = "unavailable"
    return _openai_client

def get_openai_embedding(text: str, dimension: str = "small") -> list:
    """
    Get embedding for text using OpenAI's text-embedding-3 model
    
    Args:
        text: Text to embed
        dimension: "small" (1536-dim) or "large" (3072-dim)
    
    Returns:
        List of floats representing the embedding
    """
    openai_client = get_openai_client()
    
    if not openai_client or openai_client == "unavailable":
        print("⚠ OpenAI client unavailable")
        return None
    
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-small" if dimension == "small" else "text-embedding-3-large",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"✗ Failed to generate embedding: {e}")
        return None

def cosine_similarity(vec1: list, vec2: list) -> float:
    """Calculate cosine similarity between two vectors"""
    import numpy as np
    
    vec1 = np.array(vec1)
    vec2 = np.array(vec2)
    
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return float(dot_product / (norm1 * norm2))

def parse_embedding(embedding) -> list:
    """Parse embedding from various formats (string, dict, list)"""
    import json
    
    if isinstance(embedding, list):
        return embedding
    elif isinstance(embedding, str):
        try:
            return json.loads(embedding)
        except:
            return None
    elif isinstance(embedding, dict):
        # If it's a dict with vector values
        if 'embedding' in embedding:
            return embedding['embedding']
        # Otherwise convert dict values to list
        return list(embedding.values())
    return None
