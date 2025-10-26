# Curio Image Upload Guide

This guide explains the unified image handling system in your Curio project.

## 🎯 **Unified Image Strategy**

The project now uses a **two-tier approach** for image handling:

1. **Profile Pictures**: Stored in database (fast access, small images)
2. **General Images**: Stored in Supabase Storage (scalable, large images)

## 🚀 **Quick Start**

### Profile Picture Upload (Database Storage)
```bash
POST /api/auth/profile/upload-pic
Authorization: Bearer <your-jwt-token>
Content-Type: multipart/form-data

# Upload via form data with 'file' field
```

### General Image Upload (Supabase Storage)
```bash
POST /api/storage/upload-image-file
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "image_path": "./my_image.png",
  "bucket_name": "your-bucket-name",
  "file_name": "images/my_uploaded_image.png"
}
```

### Profile Picture Upload (Supabase Storage)
```bash
POST /api/storage/upload-profile-pic-file
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "image_path": "./profile_pic.jpg"
}
```

## 📁 **File Structure**

```
Curio/backend/
├── components/
│   ├── storage.py          # Supabase Storage functionality
│   ├── auth.py             # Profile picture handling (database)
│   └── posts.py            # Existing posts (unchanged)
├── STORAGE_UPLOAD_GUIDE.md # This guide
└── app.py                  # Main Flask app
```

## 🔧 **Image Processing Functions**

### `normalize_profile_pic_data(pic_data)`
Unified function that handles all image data formats:
- Bytes data → Base64 string
- Hex-encoded strings → Base64 string  
- Data URLs → Base64 string
- Already base64 → Returns as-is

### `read_image_file(image_path)`
Reads image files with validation:
- Checks file existence
- Validates MIME type
- Returns binary data and content type

### `upload_to_supabase_storage(image_data, file_name, bucket_name, content_type)`
Uploads image data to Supabase Storage with proper error handling.

## 📋 **API Endpoints**

### Authentication Required Endpoints
- `GET /api/storage/list-buckets` - List all storage buckets
- `GET /api/storage/list-files/<bucket_name>` - List files in bucket
- `POST /api/storage/upload-image-file` - Upload any image to storage
- `POST /api/storage/upload-profile-pic-file` - Upload profile pic to storage
- `POST /api/auth/profile/upload-pic` - Upload profile pic to database
- `GET /api/auth/profile/pic/<user_id>` - Get profile picture from database

## 🎨 **Frontend Integration**

The frontend Profile component handles both upload methods:
- Direct file upload for profile pictures (database storage)
- File path upload for general images (Supabase Storage)

## ⚠️ **Important Notes**

1. **Authentication**: All endpoints require valid JWT tokens
2. **File Size Limits**: 5MB for profile pictures, 16MB for general images
3. **Supported Formats**: PNG, JPEG, GIF, WebP
4. **Error Handling**: Consistent error responses across all endpoints
5. **Data Normalization**: All image data is normalized to base64 strings

## 🧪 **Testing**

Use the remaining test files:
- `test_supabase_simple.py` - Basic Supabase connection test

## 🔄 **Migration Notes**

- Removed duplicate test files and example scripts
- Consolidated image normalization logic
- Standardized error handling patterns
- Removed duplicate image files