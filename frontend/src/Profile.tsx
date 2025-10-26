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

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfileData()
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

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setNotification({
        message: 'File too large. Maximum size is 5MB.',
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

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/storage/upload-profile-pic', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Refresh profile data to get the new picture
      await fetchProfileData()

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
      <div className="signup-page">
        <div className="signup-container">
          <div className="signup-card">
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
    <div className="signup-page">
      {/* Floating Logo */}
      <div className="floating-logo">
        <img src="/lof@curio.png" alt="Curio Logo" className="logo" />
      </div>

      {/* Back Button */}
      <button className="back-button" onClick={onBackToHome}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Home
      </button>

      {/* Profile Container */}
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
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
                      <div className="upload-spinner"></div>
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
              <div className="signup-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <div className="profile-field-display">
                      {profileData.firstName || 'Not set'}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    <div className="profile-field-display">
                      {profileData.lastName || 'Not set'}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <div className="profile-field-display">
                    {profileData.email || 'Not set'}
                  </div>
                </div>

                <div className="form-group">
                  <label>Username</label>
                  <div className="profile-field-display">
                    {profileData.username || 'Not set'}
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
