#!/usr/bin/env python3
"""
Create Supabase Storage bucket for post images
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

def create_post_images_bucket():
    """Create the post-images bucket in Supabase Storage"""
    try:
        # Check if bucket already exists
        buckets = supabase.storage.list_buckets()
        bucket_names = [bucket.name for bucket in buckets]
        
        if "post-images" in bucket_names:
            print("SUCCESS: Post images bucket already exists")
            return True
        
        # Create the bucket
        print("Creating post-images bucket...")
        response = supabase.storage.create_bucket(
            "post-images",
            options={
                "public": True,  # Make it public so images can be accessed directly
                "file_size_limit": 5242880,  # 5MB limit
                "allowed_mime_types": ["image/jpeg", "image/png", "image/gif", "image/webp"]
            }
        )
        
        print("SUCCESS: Post images bucket created successfully")
        return True
        
    except Exception as e:
        print(f"ERROR: Error creating bucket: {e}")
        return False

def setup_storage_policies():
    """Display instructions for setting up storage policies"""
    print("\nSetting up storage policies for post-images bucket...")
    print("\nNOTE: Supabase doesn't have a Python API for storage policies.")
    print("You need to set up these policies manually in the Supabase Dashboard.")
    print("\nGo to: Storage > post-images > Policies > New Policy")
    print("\nCreate the following policies:")
    
    print("\n1. READ Policy (for viewing images):")
    print("   Policy name: Allow public read access")
    print("   Policy type: SELECT")
    print("   Target roles: public")
    print("   Policy definition: true")
    
    print("\n2. INSERT Policy (for uploading):")
    print("   Policy name: Allow authenticated users to upload post images")
    print("   Policy type: INSERT")
    print("   Target roles: authenticated")
    print("   Policy definition: bucket_id = 'post-images'")
    
    print("\n3. UPDATE Policy (for updating):")
    print("   Policy name: Allow authenticated users to update post images")
    print("   Policy type: UPDATE")
    print("   Target roles: authenticated")
    print("   Policy definition: bucket_id = 'post-images'")
    
    print("\n4. DELETE Policy (for deleting):")
    print("   Policy name: Allow authenticated users to delete post images")
    print("   Policy type: DELETE")
    print("   Target roles: authenticated")
    print("   Policy definition: bucket_id = 'post-images'")
    
    print("\nAlternatively, you can use these SQL commands in the Supabase SQL Editor:")
    print("""
-- Allow public read access
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'post-images');

-- Allow authenticated users to upload post images
CREATE POLICY "Allow authenticated users to upload post images" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-images');

-- Allow authenticated users to update post images
CREATE POLICY "Allow authenticated users to update post images" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'post-images')
WITH CHECK (bucket_id = 'post-images');

-- Allow authenticated users to delete post images
CREATE POLICY "Allow authenticated users to delete post images" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'post-images');
    """)
    
    print("\n✅ Instructions displayed. Please set up the policies manually in the Supabase Dashboard.")

if __name__ == "__main__":
    print("Setting up Supabase Storage for post images...")
    
    # Create bucket
    bucket_created = create_post_images_bucket()
    
    if bucket_created:
        # Display policy setup instructions
        setup_storage_policies()
        print("\nSUCCESS: Setup complete! Post images will now use Supabase Storage.")
    else:
        print("\nERROR: Failed to create bucket. Please check your Supabase configuration.")
