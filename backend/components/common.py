"""
Common utilities and shared functions for Curio backend components
"""

import os
import time
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
# Use service role key for admin operations, fallback to regular key
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

# Check if Supabase is properly configured
if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Supabase configuration missing!")
    print(f"SUPABASE_URL: {SUPABASE_URL}")
    print(f"SUPABASE_KEY: {'SET' if SUPABASE_KEY else 'NOT SET'}")
    raise ValueError("Supabase configuration is missing. Please check your .env file.")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def retry_supabase_auth_call(func, max_retries=3, base_delay=1):
    """
    Retry mechanism for Supabase auth calls with exponential backoff
    """
    for attempt in range(max_retries):
        try:
            start_time = time.time()
            result = func()
            end_time = time.time()
            print(f"Auth call succeeded in {end_time - start_time:.2f}s (attempt {attempt + 1})")
            return result
        except Exception as e:
            error_str = str(e).lower()
            if "timeout" in error_str or "timed out" in error_str or "read operation timed out" in error_str:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)  # Exponential backoff
                    print(f"Auth call timeout (attempt {attempt + 1}/{max_retries}), retrying in {delay}s: {e}")
                    time.sleep(delay)
                    continue
                else:
                    print(f"Auth call failed after {max_retries} attempts due to timeout: {e}")
                    raise e
            elif "connection" in error_str or "network" in error_str:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"Auth call network error (attempt {attempt + 1}/{max_retries}), retrying in {delay}s: {e}")
                    time.sleep(delay)
                    continue
                else:
                    print(f"Auth call failed after {max_retries} attempts due to network error: {e}")
                    raise e
            else:
                # Non-retryable error, don't retry
                print(f"Auth call failed with non-retryable error: {e}")
                raise e
    return None

def get_user_id_from_token(request):
    """
    Extract user ID from JWT token in request headers
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    try:
        def auth_call():
            return supabase.auth.get_user(token)
        
        response = retry_supabase_auth_call(auth_call)
        if response and response.user:
            return response.user.id
    except Exception as e:
        print(f"JWT verification error: {e}")
        return None
    return None
