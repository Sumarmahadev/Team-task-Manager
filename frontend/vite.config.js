import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev only — proxies /api to local Django
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  preview: {
    // Used by Railway to serve the built app
    port: process.env.PORT || 4173,
    host: '0.0.0.0',
    allowedHosts: ['*'],
  },
})
