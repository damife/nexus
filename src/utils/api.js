import axios from 'axios'
import { toast } from 'react-toastify'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // 30 seconds timeout
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('swift_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response time for debugging
    const endTime = new Date()
    const duration = endTime - response.config.metadata.startTime
    
    if (duration > 5000) { // Slow response warning
      console.warn(`Slow API response: ${duration}ms for ${response.config.url}`)
    }
    
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Network error handling
    if (!error.response) {
      toast.error('Network error. Please check your connection.')
      return Promise.reject(error)
    }

    // Rate limiting handling
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 5000
      toast.error(`Rate limit exceeded. Retrying in ${retryAfter/1000} seconds...`)
      
      // Auto retry for rate limit
      if (!originalRequest._retry) {
        originalRequest._retry = true
        await new Promise(resolve => setTimeout(resolve, retryAfter))
        return api(originalRequest)
      }
    }

    // Server error handling
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
      return Promise.reject(error)
    }

    // Authentication error handling
    if (error.response?.status === 401) {
      localStorage.removeItem('swift_token')
      localStorage.removeItem('swift_user')
      localStorage.removeItem('refreshToken')
      toast.error('Session expired. Please log in again.')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Validation error handling
    if (error.response?.status === 400) {
      const errorMessage = error.response.data?.error || 'Invalid request'
      toast.error(errorMessage)
      return Promise.reject(error)
    }

    // Forbidden error handling
    if (error.response?.status === 403) {
      toast.error('Access denied. You do not have permission to perform this action.')
      return Promise.reject(error)
    }

    // Generic error handling
    const errorMessage = error.response.data?.error || 'An error occurred'
    toast.error(errorMessage)
    
    return Promise.reject(error)
  }
)

// Retry wrapper for critical requests
export const apiWithRetry = async (config, maxRetries = 3) => {
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await api(config)
    } catch (error) {
      lastError = error
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        break
      }
      
      // Wait before retry (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }
  }
  
  throw lastError
}

export default api

