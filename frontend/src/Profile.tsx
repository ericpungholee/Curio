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
  }, [])

  const fetchProfileData = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      onLogout()
      return
    }

    try {
      const response = await fetch('/api/auth/profile', {
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


  const handleLogout = async () => {
    const token = localStorage.getItem('access_token')
    
    if (token) {
      try {
        await fetch('/api/auth/logout', {
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
      </div>
      
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
