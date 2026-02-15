import React, { useState, useEffect } from 'react'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'

const Users = () => {
  const [users, setUsers] = useState([])
  const [banks, setBanks] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [assignModal, setAssignModal] = useState(null)
  const [statusModal, setStatusModal] = useState(null)
  const [roleModal, setRoleModal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  })

  useEffect(() => {
    fetchUsers()
    fetchBanks()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/users')
      setUsers(response.data.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Users',
        message: err.response?.data?.message || 'Failed to load users',
        errors: err.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBanks = async () => {
    try {
      const response = await api.get('/admin/banks')
      setBanks(response.data.banks || [])
    } catch (err) {
      console.error('Error fetching banks:', err)
    }
  }

  const handleAssignBank = async (userId, bankId) => {
    try {
      setLoading(true)
      const response = await api.post('/admin/assign-bank', { userId, bankId })
      if (response.data.success) {
        setSuccessModal({ isOpen: true, message: 'Bank assigned successfully!' })
        setAssignModal(null)
        fetchUsers()
      } else {
        throw new Error(response.data.message || 'Failed to assign bank')
      }
    } catch (err) {
      console.error('Error assigning bank:', err)
      setErrorModal({
        isOpen: true,
        title: 'Error Assigning Bank',
        message: err.response?.data?.message || 'Failed to assign bank to user',
        errors: err.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorModal({ isOpen: false, title: '', message: '', errors: [] })

    try {
      const response = await api.post('/admin/users', formData)
      if (response.data.success) {
        setSuccessModal({ isOpen: true, message: 'User created successfully!' })
        setShowModal(false)
        setFormData({ name: '', email: '', password: '', role: 'user' })
        fetchUsers()
      } else {
        throw new Error(response.data.message || 'Failed to create user')
      }
    } catch (err) {
      console.error('Error creating user:', err)
      setErrorModal({
        isOpen: true,
        title: 'Error Creating User',
        message: err.response?.data?.message || 'Failed to create user',
        errors: err.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (userId, status) => {
    try {
      setLoading(true)
      const response = await api.patch(`/admin/users/${userId}/status`, { status })
      if (response.data.success) {
        setSuccessModal({ isOpen: true, message: 'User status updated successfully!' })
        setStatusModal(null)
        fetchUsers()
      } else {
        throw new Error(response.data.message || 'Failed to update status')
      }
    } catch (err) {
      console.error('Error updating status:', err)
      setErrorModal({
        isOpen: true,
        title: 'Error Updating Status',
        message: err.response?.data?.message || 'Failed to update user status',
        errors: err.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId, role) => {
    try {
      setLoading(true)
      const response = await api.patch(`/admin/users/${userId}/role`, { role })
      if (response.data.success) {
        setSuccessModal({ isOpen: true, message: 'User role updated successfully!' })
        setRoleModal(null)
        fetchUsers()
      } else {
        throw new Error(response.data.message || 'Failed to update role')
      }
    } catch (err) {
      console.error('Error updating role:', err)
      setErrorModal({
        isOpen: true,
        title: 'Error Updating Role',
        message: err.response?.data?.message || 'Failed to update user role',
        errors: err.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFINDownload = async (userId, canDownload) => {
    try {
      setLoading(true)
      const response = await api.patch(`/admin/users/${userId}/fin-download`, { canDownload })
      if (response.data.success) {
        setSuccessModal({ isOpen: true, message: 'FIN download permission updated!' })
        fetchUsers()
      } else {
        throw new Error(response.data.message || 'Failed to update permission')
      }
    } catch (err) {
      console.error('Error updating permission:', err)
      setErrorModal({
        isOpen: true,
        title: 'Error Updating Permission',
        message: err.response?.data?.message || 'Failed to update FIN download permission',
        errors: err.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">User Management</h1>
            <p className="text-gray-600 font-mono">Manage users and assign banks</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <i className="bi bi-person-plus"></i>
            Add User
          </button>
        </div>

        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Assigned Bank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">FIN Download</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-mono ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-mono ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' :
                          user.status === 'banned' ? 'bg-red-100 text-red-800' :
                          user.status === 'blocked' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.bank_name ? (
                          <span className="flex items-center gap-2 font-mono">
                            <i className="bi bi-building text-blue-500"></i>
                            {user.bank_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.can_download_fin ? (
                          <i className="bi bi-check-circle text-green-600 text-lg" title="Enabled"></i>
                        ) : (
                          <i className="bi bi-x-circle text-gray-400 text-lg" title="Disabled"></i>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            onClick={() => setAssignModal(user.id)}
                            title="Assign Bank"
                            disabled={loading}
                          >
                            <i className="bi bi-link-45deg text-lg"></i>
                          </button>
                          <button
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                            onClick={() => setRoleModal(user.id)}
                            title="Change Role"
                            disabled={loading}
                          >
                            <i className="bi bi-person-badge text-lg"></i>
                          </button>
                          <button
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                            onClick={() => setStatusModal(user.id)}
                            title="Change Status"
                            disabled={loading}
                          >
                            <i className="bi bi-shield-exclamation text-lg"></i>
                          </button>
                          <button
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            onClick={() => handleToggleFINDownload(user.id, !user.can_download_fin)}
                            title={user.can_download_fin ? "Disable FIN Download" : "Enable FIN Download"}
                            disabled={loading}
                          >
                            <i className={`bi bi-download text-lg`}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12">
                  <i className="bi bi-people text-gray-300 text-5xl mb-4"></i>
                  <p className="text-gray-500 font-mono">No users found. Add your first user to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 font-mono">Add New User</h2>
              <button 
                className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-all"
                onClick={() => setShowModal(false)}
              >
                <i className="bi bi-x text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono bg-white"
                  disabled={loading}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check"></i>
                      Add User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-xl max-w-md w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 font-mono">Assign Bank to User</h2>
              <button 
                className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-all"
                onClick={() => setAssignModal(null)}
              >
                <i className="bi bi-x text-xl"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {banks.map(bank => (
                  <div
                    key={bank.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all"
                    onClick={() => handleAssignBank(assignModal, bank.id)}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="bi bi-building text-blue-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 font-mono truncate">{bank.name}</div>
                      <div className="text-sm text-gray-500 font-mono">{bank.bic}</div>
                    </div>
                    <i className="bi bi-chevron-right text-gray-400"></i>
                  </div>
                ))}
                {banks.length === 0 && (
                  <p className="text-center text-gray-500 py-8 font-mono">No banks available. Please add banks first.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {statusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setStatusModal(null)}>
          <div className="bg-white rounded-xl max-w-md w-[90%] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 font-mono">Change User Status</h2>
              <button 
                className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-all"
                onClick={() => setStatusModal(null)}
              >
                <i className="bi bi-x text-xl"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  className="flex items-center gap-3 p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-all text-left"
                  onClick={() => handleStatusChange(statusModal, 'active')}
                  disabled={loading}
                >
                  <i className="bi bi-check-circle text-green-600 text-xl"></i>
                  <span className="font-mono">Active</span>
                </button>
                <button 
                  className="flex items-center gap-3 p-4 border-2 border-red-200 rounded-lg hover:bg-red-50 transition-all text-left"
                  onClick={() => handleStatusChange(statusModal, 'banned')}
                  disabled={loading}
                >
                  <i className="bi bi-ban text-red-600 text-xl"></i>
                  <span className="font-mono">Ban User</span>
                </button>
                <button 
                  className="flex items-center gap-3 p-4 border-2 border-yellow-200 rounded-lg hover:bg-yellow-50 transition-all text-left"
                  onClick={() => handleStatusChange(statusModal, 'blocked')}
                  disabled={loading}
                >
                  <i className="bi bi-shield-exclamation text-yellow-600 text-xl"></i>
                  <span className="font-mono">Block User</span>
                </button>
                <button 
                  className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-left"
                  onClick={() => handleStatusChange(statusModal, 'suspended')}
                  disabled={loading}
                >
                  <i className="bi bi-pause-circle text-gray-600 text-xl"></i>
                  <span className="font-mono">Suspend</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {roleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setRoleModal(null)}>
          <div className="bg-white rounded-xl max-w-md w-[90%] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 font-mono">Change User Role</h2>
              <button 
                className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-all"
                onClick={() => setRoleModal(null)}
              >
                <i className="bi bi-x text-xl"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  className="flex items-center gap-3 p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-all text-left"
                  onClick={() => handleRoleChange(roleModal, 'admin')}
                  disabled={loading}
                >
                  <i className="bi bi-shield-check text-purple-600 text-xl"></i>
                  <span className="font-mono">Admin</span>
                </button>
                <button 
                  className="flex items-center gap-3 p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-all text-left"
                  onClick={() => handleRoleChange(roleModal, 'user')}
                  disabled={loading}
                >
                  <i className="bi bi-person text-blue-600 text-xl"></i>
                  <span className="font-mono">User</span>
                </button>
                <button 
                  className="flex items-center gap-3 p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-all text-left"
                  onClick={() => handleRoleChange(roleModal, 'maker')}
                  disabled={loading}
                >
                  <i className="bi bi-pencil text-green-600 text-xl"></i>
                  <span className="font-mono">Maker</span>
                </button>
                <button 
                  className="flex items-center gap-3 p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 transition-all text-left"
                  onClick={() => handleRoleChange(roleModal, 'checker')}
                  disabled={loading}
                >
                  <i className="bi bi-check-circle text-orange-600 text-xl"></i>
                  <span className="font-mono">Checker</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default Users
