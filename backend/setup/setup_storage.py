#!/usr/bin/env python3
"""
Create Supabase Storage bucket for profile pictures
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: Supabase configuration missing!")
    print("Make sure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file")
    exit(1)

# Create Supabase client with service role key for admin operations
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def create_profile_pictures_bucket():
    """Create the profile-pictures bucket in Supabase Storage"""
    try:
        # Check if bucket already exists
        buckets = supabase.storage.list_buckets()
        bucket_names = [bucket.name for bucket in buckets]
        
        if "profile-pictures" in bucket_names:
            print("SUCCESS: Profile pictures bucket already exists")
            return True
        
        # Create the bucket
        print("Creating profile-pictures bucket...")
        response = supabase.storage.create_bucket(
            "profile-pictures",
            options={
                "public": True,  # Make it public so images can be accessed directly
                "file_size_limit": 5242880,  # 5MB limit
                "allowed_mime_types": ["image/jpeg", "image/png", "image/gif", "image/webp"]
            }
        )
        
        print("SUCCESS: Profile pictures bucket created successfully")
        return True
        
    except Exception as e:
        print(f"ERROR: Error creating bucket: {e}")
        return False

def migrate_existing_profile_pic():
    """Migrate Eric's existing profile picture to storage"""
    try:
        # Get Eric's profile
        result = supabase.table("profiles").select("*").eq("username", "eric").single().execute()
        
        if not result.data:
            print("Eric's profile not found")
            return False
        
        profile = result.data
        profile_pic = profile.get('profile_pic')
        profile_id = profile.get('id')
        
        if not profile_pic:
            print("No existing profile picture to migrate")
            return True
        
        print(f"Migrating Eric's profile picture (ID: {profile_id})")
        
        if isinstance(profile_pic, str) and profile_pic.startswith('\\x'):
            # Convert hex to bytes
            import base64
            hex_data = profile_pic.replace('\\x', '').replace(r'\x', '')
            byte_data = bytes.fromhex(hex_data)
            
            # Upload to storage
            file_name = f"profile-pics/{profile_id}.png"
            
            upload_response = supabase.storage.from_("profile-pictures").upload(
                path=file_name,
                file=byte_data,
                file_options={"content-type": "image/png"}
            )
            
            # Get public URL
            public_url = supabase.storage.from_("profile-pictures").get_public_url(file_name)
            
            # Update profile with URL
            update_result = supabase.table("profiles").update({
                "profile_pic_url": public_url,
                "profile_pic": None  # Clear the old binary data
            }).eq("id", profile_id).execute()
            
            if update_result.data:
                print("SUCCESS: Successfully migrated profile picture to storage")
                print(f"Public URL: {public_url}")
                return True
            else:
                print("ERROR: Failed to update profile with storage URL")
                return False
        else:
            print("Profile picture is not in hex format, skipping migration")
            return True
            
    except Exception as e:
        print(f"Error migrating profile picture: {e}")
        return False

if __name__ == "__main__":
    print("Setting up Supabase Storage for profile pictures...")
    
    # Create bucket
    bucket_created = create_profile_pictures_bucket()
    
    if bucket_created:
        # Migrate existing profile picture
        migration_success = migrate_existing_profile_pic()
        
        if migration_success:
            print("\nSUCCESS: Setup complete! Profile pictures will now use Supabase Storage.")
            print("Please refresh your browser to see the changes.")
        else:
            print("\nWARNING: Bucket created but migration failed. You may need to upload a new profile picture.")
    else:
        print("\nERROR: Failed to create bucket. Please check your Supabase configuration.")
