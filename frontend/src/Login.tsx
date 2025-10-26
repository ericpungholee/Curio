import { useState } from 'react'
import './App.css'
import Notification from './Notification'

interface LoginProps {
  onBackToHome: () => void
  onLogin: () => void
  onNavigateToSignup: () => void
}

const Login = ({ onBackToHome, onLogin, onNavigateToSignup }: LoginProps) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 401) {
            setErrors({ submit: 'Invalid email or password' })
          } else if (response.status === 400) {
            setErrors({ submit: data.error || 'Please check your input' })
          } else if (response.status >= 500) {
            setErrors({ submit: 'Server error. Please try again later.' })
          } else {
            setErrors({ submit: data.error || 'Login failed' })
          }
          return
        }

        // Validate response data
        if (!data.access_token || !data.user_id) {
          setErrors({ submit: 'Invalid response from server' })
          return
        }

        // Store the access token in localStorage
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('user_id', data.user_id)
        
        setNotification({
          message: 'Login successful! Welcome back.',
          type: 'success',
          isVisible: true
        })
        
        // Delay navigation to show notification
        setTimeout(() => {
          onLogin()
        }, 1500)
      } catch (error) {
        console.error('Login error:', error)
        // Check if it's a network error
        if (error instanceof TypeError && error.message.includes('fetch')) {
          setErrors({ submit: 'Network error. Please check your connection.' })
        } else {
          setErrors({ submit: 'Failed to login. Please try again.' })
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

      {/* Login Form Container */}
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
            <h1>Welcome Back</h1>
            <p>Sign in to continue exploring</p>
          </div>

          <form onSubmit={handleSubmit} className="signup-form">
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
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? 'error' : ''}
                placeholder="Enter your password"
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            {errors.submit && <span className="error-message">{errors.submit}</span>}

            <button type="submit" className="signup-button">
              Sign In
            </button>
          </form>

          <div className="signup-footer">
            <p>
              Don't have an account? 
              <button className="login-link" onClick={onNavigateToSignup}>
                Sign up
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

export default Login
