/**
 * Authentication utilities for handling token refresh and API calls
 */

interface TokenResponse {
  access_token: string
  refresh_token: string
  user_id: string
}

/**
 * Attempts to refresh the access token using the stored refresh token
 */
export const refreshAccessToken = async (): Promise<TokenResponse | null> => {
  const refreshToken = localStorage.getItem('refresh_token')
  
  if (!refreshToken) {
    return null
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    // Update stored tokens
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user_id', data.user_id)
    
    return data
  } catch (error) {
    console.error('Token refresh failed:', error)
    return null
  }
}

/**
 * Makes an authenticated API call with automatic token refresh on 401 errors
 */
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('access_token')
  
  if (!token) {
    throw new Error('No access token available')
  }

  // Add authorization header
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // If we get a 401, try to refresh the token and retry once
  if (response.status === 401) {
    const refreshResult = await refreshAccessToken()
    
    if (refreshResult) {
      // Retry the request with the new token
      const newHeaders = {
        ...headers,
        'Authorization': `Bearer ${refreshResult.access_token}`,
      }
      
      return fetch(url, {
        ...options,
        headers: newHeaders,
      })
    } else {
      // Refresh failed, clear storage and throw error
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_id')
      throw new Error('Authentication failed - please log in again')
    }
  }

  return response
}

/**
 * Makes an authenticated XMLHttpRequest with automatic token refresh on 401 errors
 * This is specifically for file uploads that need progress tracking
 */
export const authenticatedXHR = async (url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    // Set up progress tracking
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      })
    }
    
    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else if (xhr.status === 401) {
        // Try to refresh token and retry
        const refreshResult = await refreshAccessToken()
        
        if (refreshResult) {
          // Retry the request with new token
          const retryXhr = new XMLHttpRequest()
          
          if (onProgress) {
            retryXhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100)
                onProgress(progress)
              }
            })
          }
          
          retryXhr.addEventListener('load', () => {
            if (retryXhr.status >= 200 && retryXhr.status < 300) {
              resolve(JSON.parse(retryXhr.responseText))
            } else {
              reject(new Error(JSON.parse(retryXhr.responseText).error || 'Upload failed'))
            }
          })
          
          retryXhr.addEventListener('error', () => {
            reject(new Error('Upload failed'))
          })
          
          retryXhr.open('POST', url)
          retryXhr.setRequestHeader('Authorization', `Bearer ${refreshResult.access_token}`)
          retryXhr.send(formData)
        } else {
          // Refresh failed, clear storage and reject
          clearAuthData()
          reject(new Error('Authentication failed - please log in again'))
        }
      } else {
        reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'))
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })
    
    const token = localStorage.getItem('access_token')
    if (!token) {
      reject(new Error('No access token available'))
      return
    }
    
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  })
}

/**
 * Clears all authentication data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_id')
  localStorage.removeItem('cached_profile')
}
