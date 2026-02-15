import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Installer from './pages/Installer'
import AdminDashboard from './pages/admin/Dashboard'
import UserDashboard from './pages/user/Dashboard'
import AdminBanks from './pages/admin/Banks'
import AdminUsers from './pages/admin/Users'
import MessageCenter from './pages/user/MessageCenter'
import ErrorModal from './components/ErrorModal'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dbInstalled, setDbInstalled] = useState(null)
  const [error, setError] = useState({ isOpen: false, title: '', message: '', errors: [] })

  useEffect(() => {
    checkDatabaseInstallation()
    const storedUser = localStorage.getItem('swift_user')
    const token = localStorage.getItem('swift_token')
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (err) {
        console.error('Error parsing user data:', err)
        localStorage.removeItem('swift_user')
        localStorage.removeItem('swift_token')
      }
    }
    setLoading(false)

    // Listen for login success events from static pages
    const handleLoginSuccess = (event) => {
      const { token, refreshToken, user } = event.detail
      
      // Update React state
      setUser(user)
      
      // Store tokens
      localStorage.setItem('swift_token', token)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('swift_user', JSON.stringify(user))
    }
    
    window.addEventListener('login-success', handleLoginSuccess)
    
    return () => {
      window.removeEventListener('login-success', handleLoginSuccess)
    }
  }, [])

  const checkDatabaseInstallation = async () => {
    try {
      const response = await axios.get('/api/installer/status')
      setDbInstalled(response.data.installed)
    } catch (error) {
      console.error('Error checking installation:', error)
      setDbInstalled(false)
      if (error.response?.status !== 404) {
        setError({
          isOpen: true,
          title: 'Connection Error',
          message: 'Unable to connect to the server. Please check your connection.',
          errors: [error.message]
        })
      }
    }
  }

  const handleLogin = (userData) => {
    try {
      setUser(userData)
      localStorage.setItem('swift_user', JSON.stringify(userData))
    } catch (err) {
      setError({
        isOpen: true,
        title: 'Login Error',
        message: 'Failed to save user data.',
        errors: [err.message]
      })
    }
  }

  const handleLogout = () => {
    try {
      setUser(null)
      localStorage.removeItem('swift_user')
      localStorage.removeItem('swift_token')
    } catch (err) {
      console.error('Error during logout:', err)
    }
  }

  const closeError = () => {
    setError({ isOpen: false, title: '', message: '', errors: [] })
  }

  if (loading || dbInstalled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-mono">Loading...</p>
        </div>
      </div>
    )
  }

  const ProtectedRoute = ({ children, requireAuth = false }) => {
    if (!dbInstalled && requireAuth) {
      return <Navigate to="/install" replace />
    }
    return children
  }

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/install" element={<Installer />} />
          <Route 
            path="/login" 
            element={
              !dbInstalled ? <Navigate to="/install" replace /> :
              user ? <Navigate to={user.role === 'admin' ? '/admin' : '/user'} /> : 
              <Login onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/swiftadmin/admin/login" 
            element={
              !dbInstalled ? <Navigate to="/swiftadmin/admin/installer" replace /> :
              user ? <Navigate to="/swiftadmin/admin/dashboard" /> : 
              <AdminLogin onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/swiftadmin/admin/installer" 
            element={
              dbInstalled ? <Navigate to="/swiftadmin/admin/login" replace /> : 
              <Installer />
            } 
          />
          <Route 
            path="/swiftadmin/admin/dashboard" 
            element={
              <ProtectedRoute requireAuth={true}>
                {user && user.role === 'admin' ? 
                  <AdminDashboard user={user} onLogout={handleLogout} /> : 
                  <Navigate to="/swiftadmin/admin/login" />
                }
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requireAuth={true}>
                {user && user.role === 'admin' ? 
                  <AdminDashboard user={user} onLogout={handleLogout} /> : 
                  <Navigate to="/swiftadmin/admin/login" />
                }
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user/*" 
            element={
              <ProtectedRoute requireAuth={true}>
                {user && user.role === 'user' ? 
                  <UserDashboard user={user} onLogout={handleLogout} /> : 
                  <Navigate to="/login" />
                }
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
      <ErrorModal
        isOpen={error.isOpen}
        onClose={closeError}
        title={error.title}
        message={error.message}
        errors={error.errors}
        type="error"
      />
    </>
  )
}

export default App
