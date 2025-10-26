/**
 * API Configuration
 * For production, set VITE_API_BASE_URL environment variable
 * For development, defaults to relative path (proxy handles it)
 */

const getApiBaseUrl = (): string => {
  // In production (Vercel), use the environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // In development, return empty string to use relative paths (vite proxy)
  return ''
}

export const API_BASE_URL = getApiBaseUrl()

