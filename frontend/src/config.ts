/**
 * API Configuration
 * For production, use Vercel's rewrite proxy (relative path)
 * For development, defaults to relative path (vite proxy handles it)
 */

const getApiBaseUrl = (): string => {
  // Check for environment variable first (overrides all defaults)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // Use relative paths for both dev and production
  // - Dev: Vite proxy in vite.config.ts handles /api requests
  // - Production: Vercel rewrite in vercel.json handles /api requests
  return ''
}

export const API_BASE_URL = getApiBaseUrl()

