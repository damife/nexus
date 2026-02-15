import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'

const AdminLanding = () => {
  const [stats, setStats] = useState({
    totalBanks: 0,
    totalUsers: 0,
    totalMessages: 0,
    activeUsers: 0
  })
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/stats')
      if (response.data.success !== false) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Statistics',
        message: error.response?.data?.message || 'Failed to load dashboard statistics',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <i className="bi bi-shield-check text-blue-600 text-3xl"></i>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 font-mono mb-2">Admin Control Center</h1>
          <p className="text-gray-600 font-mono">Manage banks, users, and system configuration</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/admin/banks" className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="bi bi-building text-blue-600 text-xl"></i>
              </div>
              <i className="bi bi-chevron-right text-gray-400 group-hover:text-blue-600 transition-colors"></i>
            </div>
            <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats.totalBanks}</div>
            <div className="text-sm text-gray-600 font-mono">Banks</div>
          </Link>

          <Link to="/admin/users" className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="bi bi-people text-green-600 text-xl"></i>
              </div>
              <i className="bi bi-chevron-right text-gray-400 group-hover:text-green-600 transition-colors"></i>
            </div>
            <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats.totalUsers}</div>
            <div className="text-sm text-gray-600 font-mono">Users</div>
          </Link>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <i className="bi bi-envelope-paper text-orange-600 text-xl"></i>
            </div>
            <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats.totalMessages}</div>
            <div className="text-sm text-gray-600 font-mono">Total Messages</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <i className="bi bi-person-check text-purple-600 text-xl"></i>
            </div>
            <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats.activeUsers}</div>
            <div className="text-sm text-gray-600 font-mono">Active Users</div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-mono mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/admin/banks" className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-building-add text-blue-600 text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-2">Manage Banks</h3>
              <p className="text-sm text-gray-600 font-mono">Add, edit, and manage financial institutions</p>
            </Link>

            <Link to="/admin/users" className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-people text-green-600 text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-2">Manage Users</h3>
              <p className="text-sm text-gray-600 font-mono">Create users and assign banks</p>
            </Link>

            <Link to="/admin/users" className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-link-45deg text-purple-600 text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-2">Assign Banks</h3>
              <p className="text-sm text-gray-600 font-mono">Link users to financial institutions</p>
            </Link>

            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-gear text-gray-600 text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-2">System Settings</h3>
              <p className="text-sm text-gray-600 font-mono">Configure system parameters</p>
            </div>
          </div>
        </div>
      </div>

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '', errors: [] })}
        title={errorModal.title}
        message={errorModal.message}
        errors={errorModal.errors}
        type="error"
      />
    </>
  )
}

export default AdminLanding
