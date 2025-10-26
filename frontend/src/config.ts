/**
 * API Configuration
 * For production, use the deployed backend URL
 * For development, defaults to relative path (proxy handles it)
 */

const getApiBaseUrl = (): string => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // In development (when not in production build), use empty string for vite proxy
  if (import.meta.env.DEV) {
    return ''
  }
  
  // In production, default to the deployed backend URL
  return 'https://curio-e9ah.onrender.com'
}

export const API_BASE_URL = getApiBaseUrl()

