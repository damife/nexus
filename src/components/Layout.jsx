import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Footer from './Footer'

const Layout = ({ user, onLogout, children, role }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    try {
      onLogout()
      navigate('/login')
    } catch (err) {
      console.error('Error during logout:', err)
    }
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to={role === 'admin' ? '/admin' : '/user'} className="flex items-center gap-3 text-xl font-bold font-mono">
                <i className="bi bi-diagram-3-fill text-blue-400 text-2xl"></i>
                <span>SwiftNexus</span>
              </Link>
              <nav className="hidden md:flex gap-1">
                {role === 'admin' ? (
                  <>
                    <Link 
                      to="/admin" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono ${
                        isActive('/admin') && !isActive('/admin/banks') && !isActive('/admin/users') && !isActive('/admin/swift-messaging') && !isActive('/admin/system-health')
                          ? 'bg-white bg-opacity-15 text-white' 
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      <i className="bi bi-speedometer2"></i>
                      <span>Dashboard</span>
                    </Link>
                    <Link 
                      to="/admin/banks" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono ${
                        isActive('/admin/banks')
                          ? 'bg-white bg-opacity-15 text-white' 
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      <i className="bi bi-bank"></i>
                      <span>Banks</span>
                    </Link>
                    <Link 
                      to="/admin/users" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono ${
                        isActive('/admin/users')
                          ? 'bg-white bg-opacity-15 text-white' 
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      <i className="bi bi-people"></i>
                      <span>Users</span>
                    </Link>
                    <Link 
                      to="/admin/swift-messaging" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono ${
                        isActive('/admin/swift-messaging')
                          ? 'bg-white bg-opacity-15 text-white' 
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      <i className="bi bi-send"></i>
                      <span>SWIFT</span>
                    </Link>
                    <Link 
                      to="/admin/system-health" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono ${
                        isActive('/admin/system-health')
                          ? 'bg-white bg-opacity-15 text-white' 
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      <i className="bi bi-heart-pulse"></i>
                      <span>Health</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/user" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono ${
                        isActive('/user') && !isActive('/user/swift-messaging') && !isActive('/user/message-history')
                          ? 'bg-white bg-opacity-15 text-white' 
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      <i className="bi bi-graph-up"></i>
                      <span>Dashboard</span>
                    </Link>
                    <Link 
                      to="/user/swift-messaging" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono ${
                        isActive('/user/swift-messaging')
                          ? 'bg-white bg-opacity-15 text-white' 
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      <i className="bi bi-send"></i>
                      <span>SWIFT</span>
                    </Link>
                    <Link 
                      to="/user/message-history" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono ${
                        isActive('/user/message-history')
                          ? 'bg-white bg-opacity-15 text-white' 
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      <i className="bi bi-clock-history"></i>
                      <span>History</span>
                    </Link>
                    <Link 
                      to="/user/settings" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono ${
                        isActive('/user/settings')
                          ? 'bg-white bg-opacity-15 text-white' 
                          : 'text-gray-300 hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      <i className="bi bi-gear"></i>
                      <span>Settings</span>
                    </Link>
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-10 rounded-lg">
                <i className="bi bi-person-circle text-xl"></i>
                <span className="font-mono">{user?.name || 'User'}</span>
              </div>
              <button 
                onClick={handleLogout} 
                className="px-4 py-2 bg-white bg-opacity-10 border-none rounded-lg text-white cursor-pointer flex items-center gap-2 font-medium transition-all hover:bg-opacity-20 font-mono"
              >
                <i className="bi bi-box-arrow-right"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>

      <Footer role={role} />
    </div>
  )
}

export default Layout
