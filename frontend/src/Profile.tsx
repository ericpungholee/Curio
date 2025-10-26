import { useState, useEffect } from 'react'
import './App.css'
import Notification from './Notification'

interface ProfileProps {
  onBackToHome: () => void
  onLogout: () => void
}

interface ProfileData {
  id: string
  firstName: string
  lastName: string
  email: string
  username: string
  createdAt: string
  profile_pic_url?: string
  profile_pic_path?: string
}

interface Post {
  id: string
  title: string
  content: string
  image_url?: string
  created_at: string
  author_id: string
  profiles?: {
    username: string
    email: string
  }
  comments?: Comment[]
  likes_count?: number
  is_liked?: boolean
}

interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  profiles?: {
    username: string
  }
  likes_count?: number
  is_liked?: boolean
}

const Profile = ({ onBackToHome, onLogout }: ProfileProps) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
    isVisible: boolean
  }>({
    message: '',
    type: 'info',
    isVisible: false
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  // Fetch profile data on component mount
  useEffect(() => {
    // Check if we have cached profile data
    const cachedProfile = localStorage.getItem('cached_profile')
    if (cachedProfile) {
      try {
        const parsedProfile = JSON.parse(cachedProfile)
        setProfileData(parsedProfile)
        setIsLoading(false)
        
        // Still fetch fresh data in background
        fetchProfileData()
      } catch (error) {
        console.error('Error parsing cached profile:', error)
        fetchProfileData()
      }
    } else {
      fetchProfileData()
    }
    
    // Fetch user posts
    fetchUserPosts()
  }, [])

  const fetchProfileData = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      onLogout()
      return
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          onLogout()
          return
        }
        throw new Error('Failed to fetch profile')
      }

    const data = await response.json()
    
    // Test if the image URL loads
    if (data.profile_pic_url) {
      try {
        const testImg = new Image()
        testImg.src = data.profile_pic_url
      } catch (e) {
        // Image test failed silently
      }
    }
    
    setProfileData(data)
    
    // Cache the profile data
    localStorage.setItem('cached_profile', JSON.stringify(data))
    } catch (error) {
      console.error('Profile fetch error:', error)
      setNotification({
        message: 'Failed to load profile data',
        type: 'error',
        isVisible: true
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserPosts = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      console.log('No access token found, skipping posts fetch')
      return
    }

    console.log('Fetching user posts...')
    console.log('Token:', token.substring(0, 20) + '...')
    setIsLoadingPosts(true)
    try {
      const response = await fetch('http://localhost:5000/api/post/my-posts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch posts:', errorText)
        console.error('Response status:', response.status)
        setNotification({
          message: `Failed to fetch posts: ${response.status}`,
          type: 'error',
          isVisible: true
        })
        throw new Error('Failed to fetch posts')
      }

      const data = await response.json()
      console.log('Posts data received:', data)
      console.log('Number of posts:', data.posts?.length || 0)
      setUserPosts(data.posts || [])
      
      if (data.posts && data.posts.length > 0) {
        console.log('First post:', data.posts[0])
      }
    } catch (error) {
      console.error('Error fetching user posts:', error)
      setNotification({
        message: 'Failed to fetch posts. Please check your connection.',
        type: 'error',
        isVisible: true
      })
    } finally {
      setIsLoadingPosts(false)
    }
  }

  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
    fetchComments(post.id)
  }

  const handleCloseModal = () => {
    setSelectedPost(null)
    setComments([])
    setNewComment('')
  }

  const fetchComments = async (postId: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    setIsLoadingComments(true)
    try {
      const response = await fetch(`http://localhost:5000/api/post/post/${postId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setComments(data.post.comments || [])
      } else {
        console.error('Failed to fetch comments')
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!selectedPost || !newComment.trim()) return

    const token = localStorage.getItem('access_token')
    if (!token) {
      onLogout()
      return
    }

    console.log('Submitting comment:', { postId: selectedPost.id, content: newComment.trim() })
    setIsSubmittingComment(true)
    try {
      const response = await fetch(`http://localhost:5000/api/post/comment/${selectedPost.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim()
        }),
      })

      console.log('Comment submission response:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Comment created successfully:', data)
        setComments(prev => [...prev, data.comment])
        setNewComment('')
        setNotification({
          message: 'Comment added successfully!',
          type: 'success',
          isVisible: true
        })
      } else {
        const errorData = await response.json()
        console.error('Comment submission failed:', errorData)
        setNotification({
          message: errorData.error || 'Failed to add comment',
          type: 'error',
          isVisible: true
        })
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
      setNotification({
        message: 'Failed to add comment',
        type: 'error',
        isVisible: true
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      onLogout()
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/post/comment/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setComments(prev => prev.filter(comment => comment.id !== commentId))
        setNotification({
          message: 'Comment deleted successfully!',
          type: 'success',
          isVisible: true
        })
      } else {
        const errorData = await response.json()
        setNotification({
          message: errorData.error || 'Failed to delete comment',
          type: 'error',
          isVisible: true
        })
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      setNotification({
        message: 'Failed to delete comment',
        type: 'error',
        isVisible: true
      })
    }
  }

  const handleLikeComment = async (commentId: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      onLogout()
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/post/like-comment/${commentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                is_liked: data.liked,
                likes_count: (comment.likes_count || 0) + (data.liked ? 1 : -1)
              }
            : comment
        ))
      } else {
        const errorData = await response.json()
        setNotification({
          message: errorData.error || 'Failed to like comment',
          type: 'error',
          isVisible: true
        })
      }
    } catch (error) {
      console.error('Error liking comment:', error)
      setNotification({
        message: 'Failed to like comment',
        type: 'error',
        isVisible: true
      })
    }
  }

  const handleLikePost = async () => {
    if (!selectedPost) return

    const token = localStorage.getItem('access_token')
    if (!token) {
      onLogout()
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/post/like-post/${selectedPost.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedPost(prev => prev ? {
          ...prev,
          is_liked: data.liked,
          likes_count: (prev.likes_count || 0) + (data.liked ? 1 : -1)
        } : null)
      } else {
        const errorData = await response.json()
        setNotification({
          message: errorData.error || 'Failed to like post',
          type: 'error',
          isVisible: true
        })
      }
    } catch (error) {
      console.error('Error liking post:', error)
      setNotification({
        message: 'Failed to like post',
        type: 'error',
        isVisible: true
      })
    }
  }

  const handleDeletePost = async () => {
    if (!selectedPost) return
    
    const confirmDelete = window.confirm('Are you sure you want to delete this post?')
    if (!confirmDelete) return

    const token = localStorage.getItem('access_token')
    if (!token) {
      onLogout()
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`http://localhost:5000/api/post/delete-post/${selectedPost.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      // Remove post from list
      setUserPosts(userPosts.filter(post => post.id !== selectedPost.id))
      setSelectedPost(null)
      
      setNotification({
        message: 'Post deleted successfully',
        type: 'success',
        isVisible: true
      })
    } catch (error) {
      console.error('Error deleting post:', error)
      setNotification({
        message: 'Failed to delete post',
        type: 'error',
        isVisible: true
      })
    } finally {
      setIsDeleting(false)
    }
  }


  const handleLogout = async () => {
    const token = localStorage.getItem('access_token')
    
    if (token) {
      try {
        await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      } catch (error) {
        console.error('Logout API call failed:', error)
      }
    }
    
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    onLogout()
  }

  const compressImage = (file: File, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setNotification({
        message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.',
        type: 'error',
        isVisible: true
      })
      return
    }

    // Validate file size (10MB max before compression)
    if (file.size > 10 * 1024 * 1024) {
      setNotification({
        message: 'File too large. Maximum size is 10MB.',
        type: 'error',
        isVisible: true
      })
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) {
      onLogout()
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Show compression progress
      setUploadProgress(10)
      setNotification({
        message: 'Compressing image...',
        type: 'info',
        isVisible: true
      })

      // Compress the image
      const compressedFile = await compressImage(file)
      setUploadProgress(30)
      
      setNotification({
        message: 'Uploading...',
        type: 'info',
        isVisible: true
      })

      const formData = new FormData()
      formData.append('file', compressedFile)

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()
      
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 60) + 30 // 30-90%
            setUploadProgress(progress)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'))
        })

        xhr.open('POST', '/api/storage/upload-profile-pic')
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.send(formData)
      })

      const data = await uploadPromise as any
      setUploadProgress(100)

      // Update profile data immediately with the new URL instead of refetching
      if (data.profile_pic_url && profileData) {
        const updatedProfile = {
          ...profileData,
          profile_pic_url: data.profile_pic_url,
          profile_pic_path: data.profile_pic_path
        }
        setProfileData(updatedProfile)
        
        // Update cache with new profile data
        localStorage.setItem('cached_profile', JSON.stringify(updatedProfile))
      }

      setNotification({
        message: 'Profile picture updated successfully!',
        type: 'success',
        isVisible: true
      })
    } catch (error) {
      console.error('Picture upload error:', error)
      setNotification({
        message: error instanceof Error ? error.message : 'Failed to upload picture',
        type: 'error',
        isVisible: true
      })
    } finally {
      setIsUploading(false)
      // Reset the input
      event.target.value = ''
    }
  }

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-card">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      {/* Floating Logo */}
      <div className="floating-logo" onClick={onBackToHome}>
        <img src="/curio.png" alt="Curio Logo" className="logo" />
      </div>

      {/* Profile Container */}
      <div className="profile-container">
        <div className="profile-layout">
          {/* Left Side - Profile Info */}
          <div className="profile-card">
            <div className="profile-header">
              <h1>Profile</h1>
              <p>Manage your account information</p>
            </div>

            {profileData && (
              <>
                {/* Profile Picture Section */}
                <div className="profile-picture-section">
                  <div className="profile-avatar">
                    {profileData.profile_pic_url && profileData.profile_pic_url.trim() !== '' ? (
                      <img 
                        src={profileData.profile_pic_url} 
                        alt="Profile" 
                        className="profile-img"
                        onError={(e) => {
                          console.error('Profile image load error:', e);
                        }}
                      />
                    ) : (
                      <div className="profile-placeholder">
                        {profileData.firstName?.[0]?.toUpperCase() || '👤'}
                      </div>
                    )}
                    {isUploading && (
                      <div className="upload-overlay">
                        <div className="upload-progress">
                          <div className="upload-spinner"></div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <div className="progress-text">{uploadProgress}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    id="profile-picture-upload"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handlePictureUpload}
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="profile-picture-upload" 
                    className="edit-picture-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    {isUploading ? 'Uploading...' : 'Edit Picture'}
                  </label>
                </div>

                {/* Profile Information */}
                <div className="profile-info">
                  <div className="info-item">
                    <span className="info-label">First Name</span>
                    <span className="info-value">{profileData.firstName || 'Not set'}</span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Last Name</span>
                    <span className="info-value">{profileData.lastName || 'Not set'}</span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Email</span>
                    <span className="info-value">{profileData.email || 'Not set'}</span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Username</span>
                    <span className="info-value">{profileData.username || 'Not set'}</span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Member Since</span>
                    <span className="info-value">
                      {profileData.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="profile-actions">
                  <button 
                    type="button" 
                    className="logout-button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>

              </>
            )}
          </div>

          {/* Right Side - User Posts Feed */}
          {profileData && (
            <div className="profile-posts-card">
              <h2 className="posts-feed-title">My Posts</h2>
              {isLoadingPosts ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading posts...</p>
                </div>
              ) : userPosts.length > 0 ? (
                <div className="posts-feed">
                  {userPosts.map((post) => (
                    <div key={post.id} className="post-feed-item" onClick={() => handlePostClick(post)}>
                      {post.image_url && (
                        <div className="post-feed-image">
                          <img src={post.image_url} alt={post.title} />
                        </div>
                      )}
                      <div className="post-feed-content">
                        <h3 className="post-feed-item-title">{post.title}</h3>
                        <p className="post-feed-text">{post.content}</p>
                        <span className="post-feed-date">
                          {new Date(post.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-posts">
                  <p>You haven't created any posts yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="post-detail-modal-overlay" onClick={handleCloseModal}>
          <div className="post-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="post-detail-header">
              <h2 className="post-detail-title">{selectedPost.title}</h2>
              <button 
                className="post-detail-close-btn"
                onClick={handleCloseModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            {selectedPost.image_url && (
              <div className="post-detail-image">
                <img 
                  src={selectedPost.image_url} 
                  alt={selectedPost.title}
                  loading="lazy"
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto', 
                    width: 'auto',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  onError={(e) => {
                    console.error('Image failed to load:', selectedPost.image_url)
                    e.currentTarget.style.display = 'none'
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget
                    console.log('Image loaded successfully in Profile view')
                    console.log('Image dimensions:', img.naturalWidth, 'x', img.naturalHeight)
                    console.log('Displayed dimensions:', img.width, 'x', img.height)
                    console.log('Image aspect ratio:', img.naturalWidth / img.naturalHeight)
                  }}
                />
              </div>
            )}
            
            <div className="post-detail-content">
              <p className="post-detail-text">{selectedPost.content}</p>
              <div className="post-detail-footer">
                <div className="post-detail-actions">
                  <button
                    className={`post-like-btn ${selectedPost.is_liked ? 'liked' : ''}`}
                    onClick={handleLikePost}
                    aria-label={selectedPost.is_liked ? 'Unlike post' : 'Like post'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <span>{selectedPost.likes_count || 0}</span>
                  </button>
                </div>
                <div className="post-detail-meta">
                  <span className="post-detail-date">
                    {new Date(selectedPost.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <button 
                    className="post-delete-btn"
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    aria-label="Delete post"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="comments-section">
              <h3 className="comments-title">Comments ({comments.length})</h3>
              
              {/* Add Comment Form */}
              <div className="add-comment-form">
                <textarea
                  className="comment-input"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  disabled={isSubmittingComment}
                />
                <button
                  className="comment-submit-btn"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                >
                  {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>

              {/* Comments List */}
              <div className="comments-list">
                {isLoadingComments ? (
                  <div className="comments-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading comments...</p>
                  </div>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-author">
                          @{comment.profiles?.username || 'Unknown'}
                        </span>
                        <span className="comment-date">
                          {new Date(comment.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {comment.author_id === profileData?.id && (
                          <button
                            className="comment-delete-btn"
                            onClick={() => handleDeleteComment(comment.id)}
                            aria-label="Delete comment"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        )}
                      </div>
                      <p className="comment-content">{comment.content}</p>
                      <div className="comment-actions">
                        <button
                          className={`comment-like-btn ${comment.is_liked ? 'liked' : ''}`}
                          onClick={() => handleLikeComment(comment.id)}
                          aria-label={comment.is_liked ? 'Unlike comment' : 'Like comment'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                          </svg>
                          <span>{comment.likes_count || 0}</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-comments">
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  )
}

export default Profile
