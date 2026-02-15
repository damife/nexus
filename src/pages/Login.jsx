import React, { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorModal from '../components/ErrorModal'
import SuccessModal from '../components/SuccessModal'

const Login = ({ onLogin, isAdminLogin = false }) => {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [success, setSuccess] = useState({ isOpen: false, message: '' })
  const navigate = useNavigate()

  // Refs for debouncing and idempotency
  const loginTimeoutRef = useRef(null)
  const idempotencyKeyRef = useRef(null)

  // Generate unique idempotency key
  const generateIdempotencyKey = () => {
    return `login-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  // Debounced login function
  const debouncedLogin = useCallback(async (loginData) => {
    // Clear any existing timeout
    if (loginTimeoutRef.current) {
      clearTimeout(loginTimeoutRef.current)
    }

    // Set new timeout for debouncing
    loginTimeoutRef.current = setTimeout(async () => {
      await performLogin(loginData)
    }, 1000) // 1 second debounce
  }, [])

  const performLogin = async (loginData) => {
    setLoading(true)
    setError({ isOpen: false, title: '', message: '', errors: [] })

    try {
      // Generate or reuse idempotency key
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateIdempotencyKey()
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKeyRef.current
        },
        body: JSON.stringify(loginData)
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if this is an idempotent response
        if (data.idempotent) {
          setSuccess({ isOpen: true, message: 'Login request already processed. Redirecting...' })
          setTimeout(() => {
            if (data.data?.user) {
              localStorage.setItem('swift_token', data.data.token)
              onLogin(data.data.user)
              if (data.data.user.role === 'admin' || data.data.user.is_admin) {
                navigate('/admin')
              } else {
                navigate('/user')
              }
            }
          }, 1000)
          return
        }
        throw new Error(data.error || data.message || 'Login failed')
      }

      if (data.success) {
        try {
          localStorage.setItem('swift_token', data.token)
          onLogin(data.user)
          
          // Check if this is admin login and user has admin role
          if (isAdminLogin && data.user.role !== 'admin' && !data.user.is_admin) {
            throw new Error('Access denied. Admin privileges required.')
          }
          
          setSuccess({ isOpen: true, message: 'Login successful! Redirecting...' })
          setTimeout(() => {
            if (data.user.role === 'admin' || data.user.is_admin) {
              navigate('/admin')
            } else {
              navigate('/user')
            }
          }, 1000)
        } catch (err) {
          throw new Error('Failed to save login data: ' + err.message)
        }
      } else {
        throw new Error(data.message || 'Invalid credentials')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError({ 
        isOpen: true, 
        title: 'Login Failed', 
        message: err.message || 'An error occurred during login. Please try again.',
        errors: []
      })
    } finally {
      setLoading(false)
      // Clear idempotency key after successful/failed login
      idempotencyKeyRef.current = null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Prevent multiple submissions
    if (loading) {
      return
    }

    // Use debounced login
    debouncedLogin(formData)
  }

  const closeError = () => {
    setError({ isOpen: false, title: '', message: '', errors: [] })
  }

  const closeSuccess = () => {
    setSuccess({ isOpen: false, message: '' })
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 ${isAdminLogin ? 'bg-gradient-to-r from-slate-600 to-slate-700' : 'bg-blue-600'} rounded-full mb-4`}>
              <i className="bi bi-diagram-3-fill text-white text-3xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 font-mono mb-2">
              SwiftNexus Enterprise
              {isAdminLogin && (
                <span className="ml-2 text-xs px-2 py-1 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-full font-semibold">
                  ADMIN
                </span>
              )}
            </h1>
            <p className="text-gray-600 font-mono">
              {isAdminLogin ? 'Admin Sign In' : 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">
                <i className="bi bi-envelope mr-2"></i>
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">
                <i className="bi bi-lock mr-2"></i>
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="w-full btn btn-primary" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right"></i>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600 font-mono mb-2">Demo Credentials:</p>
            <p className="text-xs text-gray-500 font-mono"><strong>Admin:</strong> admin@swiftnexus.com / admin123</p>
            <p className="text-xs text-gray-500 font-mono"><strong>User:</strong> user@swiftnexus.com / user123</p>
            
            {isAdminLogin && (
              <div className="mt-4 space-y-2">
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 font-mono mb-2">Alternative Options:</p>
                  <div className="flex justify-center space-x-4">
                    <button
                      type="button"
                      onClick={() => window.location.href = '/login'}
                      className="text-xs text-blue-600 hover:text-blue-800 font-mono transition-colors"
                    >
                      <i className="bi bi-person-circle mr-1"></i>
                      User Login
                    </button>
                    <button
                      type="button"
                      onClick={() => window.location.href = '/installer'}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-mono transition-colors"
                    >
                      <i className="bi bi-tools mr-1"></i>
                      Installer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ErrorModal
        isOpen={error.isOpen}
        onClose={closeError}
        title={error.title}
        message={error.message}
        errors={error.errors}
        type="error"
      />
      <SuccessModal
        isOpen={success.isOpen}
        onClose={closeSuccess}
        message={success.message}
      />
    </>
  )
}

export default Login
