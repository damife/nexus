import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, '..'),
  publicDir: path.resolve(__dirname, '../public'),

  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, '../index.html'),
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@assets': path.resolve(__dirname, '../assets'),
      '@pages': path.resolve(__dirname, '../pages'),
      '@server': path.resolve(__dirname, '../server')
    }
  },

  server: {
    port: 3001,
    host: true,
    strictPort: true,
    allowedHosts: ['swiftnexus.org', 'localhost', '209.74.85.100'],
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    },
    fs: {
      strict: false,
      allow: ['..']
    }
  },

  preview: {
    port: parseInt(process.env.VITE_PREVIEW_PORT || '4173'),
    host: true,
    strictPort: false
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios']
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'global': 'globalThis'
  },
  
  envPrefix: 'VITE_',

  // Only load env from ./env-vite (optional) so root .env with UPLOAD_PATH=./uploads
  // is never parsed by Vite (avoids "invalid JS syntax" at .env:60:22).
  // If env-vite folder or .env doesn't exist, Vite falls back to root; then fix .env line 60 to UPLOAD_PATH=/uploads
  // envDir: path.resolve(__dirname, '../env-vite'),

  // Fix NODE_ENV production issue
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
})
