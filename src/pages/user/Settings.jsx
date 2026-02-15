import React, { useState, useEffect } from 'react'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'

const Settings = () => {
  const [user, setUser] = useState(null)
  const [bankInfo, setBankInfo] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notifications: {
      email: true,
      alerts: true,
      messages: true
    }
  })
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const storedUser = JSON.parse(localStorage.getItem('swift_user') || '{}')
      setUser(storedUser)
      
      const bankResponse = await api.get('/user/bank-info')
      setBankInfo(bankResponse.data.bank)
      
      setFormData({
        name: storedUser.name || '',
        email: storedUser.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        notifications: {
          email: true,
          alerts: true,
          messages: true
        }
      })
    } catch (error) {
      console.error('Error fetching user data:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Settings',
        message: 'Failed to load user settings',
        errors: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorModal({ isOpen: false, title: '', message: '', errors: [] })
    setSuccessModal({ isOpen: false, message: '' })
    
    try {
      if (formData.newPassword) {
        if (formData.newPassword.length < 8) {
          throw new Error('New password must be at least 8 characters')
        }
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (!formData.currentPassword) {
          throw new Error('Current password is required to change password')
        }
      }

      const updateData = {
        name: formData.name,
        email: formData.email
      }

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword
        updateData.newPassword = formData.newPassword
      }

      const response = await api.patch('/user/profile', updateData)
      
      if (response.data.success) {
        const updatedUser = { ...user, name: formData.name, email: formData.email }
        localStorage.setItem('swift_user', JSON.stringify(updatedUser))
        setUser(updatedUser)
        
        setSuccessModal({ isOpen: true, message: 'Settings saved successfully!' })
        setFormData({
          ...formData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        throw new Error(response.data.message || 'Failed to save settings')
      }
    } catch (error) {
      setErrorModal({
        isOpen: true,
        title: 'Error Saving Settings',
        message: error.response?.data?.message || error.message || 'Failed to save settings',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationChange = (key, value) => {
    setFormData({
      ...formData,
      notifications: {
        ...formData.notifications,
        [key]: value
      }
    })
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
          <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Settings</h1>
          <p className="text-gray-600 font-mono">Manage your account settings and preferences</p>
        </div>

        {successModal.isOpen && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <i className="bi bi-check-circle text-green-600 text-xl"></i>
            <span className="text-green-800 font-mono">{successModal.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <i className="bi bi-person-circle text-blue-600 text-xl"></i>
                <h2 className="text-xl font-semibold text-gray-900 font-mono">Profile Information</h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    disabled={saving}
                  />
                </div>

                {bankInfo && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Assigned Bank</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 font-mono mb-1">Institution Name</label>
                        <div className="text-sm font-semibold text-gray-900 font-mono">{bankInfo.name || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 font-mono mb-1">BIC Code</label>
                        <div className="text-sm font-semibold text-gray-900 font-mono">{bankInfo.bic || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 font-mono mb-1">Customer Number</label>
                        <div className="text-sm font-semibold text-gray-900 font-mono">{bankInfo.customer_number || bankInfo.customerNumber || 'N/A'}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 font-mono mb-1">Registration Number</label>
                        <div className="text-sm font-semibold text-gray-900 font-mono">{bankInfo.registration_number || bankInfo.registrationNumber || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Current Password</label>
                      <input
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                        placeholder="Enter current password to change"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">New Password</label>
                      <input
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        placeholder="Leave blank to keep current password"
                        minLength={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Confirm New Password</label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Notification Preferences</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifications.email}
                        onChange={(e) => handleNotificationChange('email', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        disabled={saving}
                      />
                      <span className="font-mono">Email Notifications</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifications.alerts}
                        onChange={(e) => handleNotificationChange('alerts', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        disabled={saving}
                      />
                      <span className="font-mono">System Alerts</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifications.messages}
                        onChange={(e) => handleNotificationChange('messages', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        disabled={saving}
                      />
                      <span className="font-mono">Message Notifications</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle"></i>
                        Save Settings
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <i className="bi bi-info-circle text-blue-600 text-xl"></i>
                <h2 className="text-xl font-semibold text-gray-900 font-mono">Account Information</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 font-mono mb-1">User Role</label>
                  <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800 font-mono">
                    {user?.role || 'user'}
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 font-mono mb-1">Account Status</label>
                  <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 font-mono">
                    Active
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 font-mono mb-1">FIN Download Access</label>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full font-mono ${
                    user?.can_download_fin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user?.can_download_fin ? 'Enabled' : 'Disabled'}
                  </span>
                  <p className="text-xs text-gray-500 mt-2 font-mono">Contact administrator to enable FIN copy downloads</p>
                </div>
              </div>
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
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
      />
    </>
  )
}

export default Settings
