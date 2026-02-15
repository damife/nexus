import React, { useState, useEffect } from 'react'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'

const Profile = () => {
  const [userInfo, setUserInfo] = useState(null)
  const [bankInfo, setBankInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })

  useEffect(() => {
    fetchUserInfo()
    fetchBankInfo()
  }, [])

  const fetchUserInfo = async () => {
    try {
      const response = await api.get('/user/profile')
      setUserInfo(response.data.user)
      setFormData(response.data.user)
    } catch (error) {
      console.error('Error fetching user info:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Profile',
        message: error.response?.data?.message || 'Failed to load profile information',
        errors: error.response?.data?.errors || []
      })
    }
  }

  const fetchBankInfo = async () => {
    try {
      const response = await api.get('/user/bank-info')
      setBankInfo(response.data.bank)
    } catch (error) {
      console.error('Error fetching bank info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await api.patch('/user/profile', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      })

      setUserInfo(response.data.user)
      setSuccessModal({ isOpen: true, message: 'Profile updated successfully!' })
      setEditMode(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Updating Profile',
        message: error.response?.data?.message || 'Failed to update profile',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'maker': return 'bg-green-100 text-green-800'
      case 'checker': return 'bg-orange-100 text-orange-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'banned': return 'bg-red-100 text-red-800'
      case 'blocked': return 'bg-yellow-100 text-yellow-800'
      case 'suspended': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">My Profile</h1>
            <p className="text-gray-600 font-mono">View and manage your account information</p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setEditMode(!editMode)}
          >
            <i className={`bi bi-${editMode ? 'x' : 'pencil'} mr-2`}></i>
            {editMode ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {/* User Information */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="bi bi-person-circle text-blue-600 text-2xl"></i>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 font-mono mb-1">Personal Information</h2>
              <p className="text-sm text-gray-600 font-mono">Your account details and registration information</p>
            </div>
          </div>

          {editMode ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Full Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Email Address</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Role</label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-mono ${getRoleBadgeColor(userInfo.role)}`}>
                      {userInfo.role}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check mr-2"></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="bi bi-person text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">Full Name</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono">{userInfo.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="bi bi-envelope text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">Email Address</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono">{userInfo.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="bi bi-telephone text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">Phone Number</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono">{userInfo.phone || 'Not provided'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="bi bi-shield-check text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">Account Status</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-mono ${getStatusBadgeColor(userInfo.status)}`}>
                    {userInfo.status || 'active'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="bi bi-person-badge text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">Role</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-mono ${getRoleBadgeColor(userInfo.role)}`}>
                    {userInfo.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="bi bi-calendar-check text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">Registration Date</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono">{formatDate(userInfo.created_at)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bank Information */}
        {bankInfo && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="bi bi-building text-green-600 text-2xl"></i>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 font-mono mb-1">Bank Information</h2>
                <p className="text-sm text-gray-600 font-mono">Institution details assigned by administrator</p>
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
                  <div className="text-xs text-gray-500 font-mono mb-1">BIC Code</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono">{bankInfo.bic || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="bi bi-hash text-gray-400"></i>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono mb-1">Customer Number</div>
                  <div className="text-sm font-semibold text-gray-900 font-mono">{bankInfo.customer_number || bankInfo.customerNumber || 'N/A'}</div>
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
                  <div className="text-sm font-semibold text-gray-900 font-mono">
                    {bankInfo.address}, {bankInfo.city || ''}, {bankInfo.country}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Statistics */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="bi bi-graph-up text-purple-600 text-2xl"></i>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 font-mono mb-1">Account Statistics</h2>
              <p className="text-sm text-gray-600 font-mono">Your activity overview</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 font-mono mb-1">{userInfo.total_messages || 0}</div>
              <div className="text-sm text-blue-800 font-mono">Total Messages Sent</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 font-mono mb-1">{userInfo.successful_messages || 0}</div>
              <div className="text-sm text-green-800 font-mono">Successful Messages</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 font-mono mb-1">{userInfo.days_active || 0}</div>
              <div className="text-sm text-orange-800 font-mono">Days Active</div>
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

export default Profile
