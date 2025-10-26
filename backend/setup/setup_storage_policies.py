#!/usr/bin/env python3
"""
Set up Supabase Storage bucket policies for profile pictures
This script configures storage policies to allow users to manage their own profile pictures
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

def setup_storage_policies():
    """Set up storage policies for the profile-pictures bucket"""
    
    print("Setting up storage policies for profile-pictures bucket...")
    print("\nNOTE: Supabase doesn't have a Python API for storage policies.")
    print("You need to set up these policies manually in the Supabase Dashboard.")
    print("\nGo to: Storage > profile-pictures > Policies > New Policy")
    print("\nCreate the following policies:")
    
    print("\n1. READ Policy (for viewing images):")
    print("   Policy name: Allow public read access")
    print("   Policy type: SELECT")
    print("   Target roles: public")
    print("   Policy definition: true")
    
    print("\n2. INSERT Policy (for uploading):")
    print("   Policy name: Allow authenticated users to upload their own profile pictures")
    print("   Policy type: INSERT")
    print("   Target roles: authenticated")
    print("   Policy definition: (bucket_id = 'profile-pictures') AND (auth.uid()::text = (storage.foldername(name))[1])")
    print("   This ensures users can only upload to folders named with their user ID")
    
    print("\n3. UPDATE Policy (for updating):")
    print("   Policy name: Allow authenticated users to update their own profile pictures")
    print("   Policy type: UPDATE")
    print("   Target roles: authenticated")
    print("   Policy definition: (bucket_id = 'profile-pictures') AND (auth.uid()::text = (storage.foldername(name))[1])")
    
    print("\n4. DELETE Policy (for deleting/updating):")
    print("   Policy name: Allow authenticated users to delete their own profile pictures")
    print("   Policy type: DELETE")
    print("   Target roles: authenticated")
    print("   Policy definition: (bucket_id = 'profile-pictures') AND (auth.uid()::text = (storage.foldername(name))[1])")
    
    print("\nAlternatively, you can use these SQL commands in the Supabase SQL Editor:")
    print("""
-- Allow public read access
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- Allow authenticated users to upload their own profile pictures
CREATE POLICY "Allow authenticated users to upload their own profile pictures" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own profile pictures
CREATE POLICY "Allow authenticated users to update their own profile pictures" ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own profile pictures
CREATE POLICY "Allow authenticated users to delete their own profile pictures" ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
    """)
    
    print("\n✅ Instructions displayed. Please set up the policies manually in the Supabase Dashboard.")

if __name__ == "__main__":
    setup_storage_policies()
