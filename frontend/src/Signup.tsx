import { useState } from 'react'
import './App.css'
import Notification from './Notification'

interface SignupProps {
  onBackToHome: () => void
  onSignupSuccess: () => void
  onNavigateToLogin: () => void
}

const Signup = ({ onBackToHome, onSignupSuccess, onNavigateToLogin }: SignupProps) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
    isVisible: boolean
  }>({
    message: '',
    type: 'info',
    isVisible: false
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            username: formData.username,
            password: formData.password,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 400) {
            if (data.error && data.error.includes('Username already taken')) {
              setErrors({ username: 'Username already taken' })
            } else if (data.error && data.error.includes('email')) {
              setErrors({ email: 'Email already registered' })
            } else {
              setErrors({ submit: data.error || 'Please check your input' })
            }
          } else if (response.status >= 500) {
            setErrors({ submit: 'Server error. Please try again later.' })
          } else {
            setErrors({ submit: data.error || 'Registration failed' })
          }
          return
        }

        // Validate response data
        if (!data.user_id || !data.username) {
          setErrors({ submit: 'Invalid response from server' })
          return
        }

        setNotification({
          message: 'Account created successfully! Please check your email to verify your account.',
          type: 'success',
          isVisible: true
        })
        
        // Delay navigation to show notification
        setTimeout(() => {
          onSignupSuccess()
        }, 2000)
      } catch (error) {
        console.error('Signup error:', error)
        // Check if it's a network error
        if (error instanceof TypeError && error.message.includes('fetch')) {
          setErrors({ submit: 'Network error. Please check your connection.' })
        } else {
          setErrors({ submit: 'Failed to create account. Please try again.' })
        }
      }
    }
  }

  return (
    <div className="signup-page">
      {/* Floating Logo */}
      <div className="floating-logo" onClick={onBackToHome}>
        <img src="/curio.png" alt="Curio Logo" className="logo" />
      </div>

      {/* Back Button */}
      <button className="back-button" onClick={onBackToHome}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Home
      </button>

      {/* Signup Form Container */}
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
            <h1>Join Curio</h1>
            <p>Create your account to start exploring</p>
          </div>

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={errors.firstName ? 'error' : ''}
                  placeholder="Enter your first name"
                />
                {errors.firstName && <span className="error-message">{errors.firstName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={errors.lastName ? 'error' : ''}
                  placeholder="Enter your last name"
                />
                {errors.lastName && <span className="error-message">{errors.lastName}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'error' : ''}
                placeholder="Enter your email"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={errors.username ? 'error' : ''}
                placeholder="Choose a username"
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? 'error' : ''}
                placeholder="Create a password"
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            {errors.submit && <span className="error-message">{errors.submit}</span>}

            <button type="submit" className="signup-button">
              Create Account
            </button>
          </form>

          <div className="signup-footer">
            <p>
              Already have an account? 
              <button className="login-link" onClick={onNavigateToLogin}>
                Sign in
              </button>
            </p>
          </div>
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

export default Signup
