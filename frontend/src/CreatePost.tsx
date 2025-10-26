import React, { useState, useRef } from 'react'
import './App.css'

interface CreatePostProps {
  onBackToHome: () => void
  onPostCreated?: () => void
}

interface NotificationState {
  show: boolean
  type: 'success' | 'error' | 'info'
  message: string
}

const CreatePost: React.FC<CreatePostProps> = ({ onBackToHome, onPostCreated }) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    type: 'info',
    message: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ show: true, type, message })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 4000)
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        showNotification('error', 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.')
        return
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('error', 'File too large. Maximum size is 5MB.')
        return
      }

      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', imageFile)

      const token = localStorage.getItem('access_token')
      const response = await fetch('http://localhost:5000/api/post/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      })

      // Check if response is ok and has content
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to upload image'
        
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      // Check if response has content before parsing JSON
      const responseText = await response.text()
      if (!responseText.trim()) {
        throw new Error('Empty response from server')
      }

      const data = JSON.parse(responseText)
      return data.image_url
    } catch (error) {
      console.error('Image upload error:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!title.trim() || !content.trim()) {
      showNotification('error', 'Title and content are required.')
      return
    }

    setIsSubmitting(true)
    try {
      let imageUrl = null
      
      // Upload image first if one is selected
      if (imageFile) {
        try {
          imageUrl = await uploadImage()
        } catch (error) {
          showNotification('error', 'Failed to upload image. Please try again.')
          return
        }
      }

      // Create the post
      const token = localStorage.getItem('access_token')
      const postData = {
        title: title.trim(),
        content: content.trim(),
        ...(imageUrl && { image_url: imageUrl })
      }

      const response = await fetch('http://localhost:5000/api/post/create-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(postData)
      })

      // Check if response is ok and has content
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to create post'
        
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      // Check if response has content before parsing JSON
      const responseText = await response.text()
      if (!responseText.trim()) {
        throw new Error('Empty response from server')
      }

      const data = JSON.parse(responseText)

      showNotification('success', 'Post created successfully!')
      // Reset form
      setTitle('')
      setContent('')
      setImageFile(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Call callback if provided
      if (onPostCreated) {
        setTimeout(() => {
          onPostCreated()
        }, 1500)
      }
    } catch (error) {
      console.error('Post creation error:', error)
      showNotification('error', error instanceof Error ? error.message : 'Failed to create post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="create-post-page">
      {/* Floating Logo */}
      <div className="floating-logo" onClick={onBackToHome}>
        <img src="/curio.png" alt="Curio Logo" className="logo" />
      </div>

      {/* Back Button */}
      <button className="back-button" onClick={onBackToHome}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Home
      </button>

      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type} ${notification.show ? 'show' : 'hide'}`}>
          <div className="notification-content">
            <div className="notification-icon">
              {notification.type === 'success' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              )}
              {notification.type === 'error' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
              )}
              {notification.type === 'info' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
              )}
            </div>
            <div className="notification-message">{notification.message}</div>
            <button 
              className="notification-close" 
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="create-post-container">
        <div className="create-post-card">
          <div className="create-post-header">
            <h1>Create New Post</h1>
            <p>Share your thoughts with the community</p>
          </div>

          <form className="create-post-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your post about?"
                maxLength={200}
                disabled={isSubmitting || isUploading}
              />
              <div className="character-count">{title.length}/200</div>
            </div>

            <div className="form-group">
              <label htmlFor="content">Content</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts..."
                rows={6}
                maxLength={2000}
                disabled={isSubmitting || isUploading}
              />
              <div className="character-count">{content.length}/2000</div>
            </div>

            <div className="form-group">
              <label htmlFor="image">Image (Optional)</label>
              <div className="image-upload-section">
                <input
                  ref={fileInputRef}
                  id="image"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageSelect}
                  disabled={isSubmitting || isUploading}
                  style={{ display: 'none' }}
                />
                
                {!imagePreview ? (
                  <button
                    type="button"
                    className="image-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || isUploading}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Choose Image
                  </button>
                ) : (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={removeImage}
                      disabled={isSubmitting || isUploading}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="image-help-text">
                Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={onBackToHome}
                disabled={isSubmitting || isUploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="create-post-button"
                disabled={isSubmitting || isUploading || !title.trim() || !content.trim()}
              >
                {isSubmitting ? (
                  <>
                    <div className="button-spinner"></div>
                    {isUploading ? 'Uploading...' : 'Creating...'}
                  </>
                ) : (
                  'Create Post'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreatePost
