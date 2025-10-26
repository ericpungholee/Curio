/**
 * API Configuration
 * For production, use direct API URL from environment variable
 * For development, use relative path (vite proxy handles it)
 */

const getApiBaseUrl = (): string => {
  // Check for environment variable first (for production)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // In development, use relative paths (Vite proxy handles it)
  // In production, VITE_API_BASE_URL should be set to the Render API URL
  if (import.meta.env.MODE === 'development') {
    return ''
  }
  
  // Production fallback - use Render API directly
  return 'https://curio-e9ah.onrender.com'
}

export const API_BASE_URL = getApiBaseUrl()

