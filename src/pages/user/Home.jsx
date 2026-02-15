import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'

const UserHome = () => {
  const [bankInfo, setBankInfo] = useState(null)
  const [stats, setStats] = useState({
    totalMessages: 0,
    pending: 0,
    completed: 0,
    today: 0
  })
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })

  useEffect(() => {
    fetchBankInfo()
    fetchStats()
  }, [])

  const fetchBankInfo = async () => {
    try {
      const response = await api.get('/user/bank-info')
      setBankInfo(response.data.bank)
    } catch (err) {
      console.error('Error fetching bank info:', err)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Bank Information',
        message: err.response?.data?.message || 'Failed to load bank information',
        errors: err.response?.data?.errors || []
      })
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/user/stats')
      setStats(response.data)
    } catch (err) {
      console.error('Error fetching stats:', err)
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Dashboard</h1>
          <p className="text-gray-600 font-mono">Welcome to your SWIFT message management portal</p>
        </div>

        {bankInfo && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="bi bi-building text-blue-600 text-2xl"></i>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 font-mono mb-1">My Profile</h2>
                <p className="text-sm text-gray-600 font-mono">Institution Information</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="bi bi-building text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">Institution Name</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono">{bankInfo.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="bi bi-upc-scan text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">BIC</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono">{bankInfo.bic || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="bi bi-hash text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">Customer Number</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono">{bankInfo.customer_number || bankInfo.customerNumber || '0'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="bi bi-card-text text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">Registration Number</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono">{bankInfo.registration_number || bankInfo.registrationNumber || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg md:col-span-2">
                <i className="bi bi-geo-alt text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">Address</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono">{bankInfo.address}, {bankInfo.country}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="bi bi-envelope-paper text-blue-600 text-xl"></i>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats.totalMessages}</div>
            <div className="text-sm text-gray-600 font-mono">Total Messages</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="bi bi-clock text-orange-600 text-xl"></i>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats.pending}</div>
            <div className="text-sm text-gray-600 font-mono">Pending</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="bi bi-check-circle text-green-600 text-xl"></i>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats.completed}</div>
            <div className="text-sm text-gray-600 font-mono">Completed</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="bi bi-calendar-day text-purple-600 text-xl"></i>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats.today}</div>
            <div className="text-sm text-gray-600 font-mono">Today</div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-mono mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/user/dashboard" className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all text-center">
              <i className="bi bi-speedometer2 text-blue-600 text-3xl mb-3"></i>
              <span className="block text-lg font-semibold text-gray-900 font-mono">Operator Dashboard</span>
            </Link>
            <Link to="/user/queue" className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all text-center">
              <i className="bi bi-list-ul text-green-600 text-3xl mb-3"></i>
              <span className="block text-lg font-semibold text-gray-900 font-mono">Message Queue</span>
            </Link>
            <Link to="/user/message/new" className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all text-center">
              <i className="bi bi-plus-circle text-purple-600 text-3xl mb-3"></i>
              <span className="block text-lg font-semibold text-gray-900 font-mono">Create Message</span>
            </Link>
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

export default UserHome
