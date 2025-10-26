import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    // Use "/" for Vercel deployment (serves from root)
    // Set VITE_BASE_PATH to "/Curio/" only if deploying to GitHub Pages with that subpath
    base: process.env.VITE_BASE_PATH || "/",
    server: {
      proxy: {
        '/api': {
          // Proxy to local backend in dev, or production backend if VITE_API_TARGET is set
          target: process.env.VITE_API_TARGET || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
})
