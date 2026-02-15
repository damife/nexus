import React, { useState, useEffect } from 'react'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'
import { Card, Button, Input, Badge } from '../../components/UIComponents'

const TenantManagement = () => {
  const [tenants, setTenants] = useState([])
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  
  const [showCreateTenant, setShowCreateTenant] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  
  const [newTenant, setNewTenant] = useState({
    name: '',
    domain: '',
    bicCode: '',
    settings: {}
  })
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    tenantRole: 'user',
    permissions: []
  })

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/tenants')
      setTenants(response.data.tenants)
    } catch (error) {
      console.error('Error fetching tenants:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Tenants',
        message: error.response?.data?.message || 'Failed to load tenants'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTenantUsers = async (tenantId) => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/tenants/${tenantId}/users`)
      setUsers(response.data.users)
    } catch (error) {
      console.error('Error fetching tenant users:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Users',
        message: error.response?.data?.message || 'Failed to load tenant users'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTenant = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const response = await api.post('/admin/tenants', newTenant)
      
      setSuccessModal({
        isOpen: true,
        message: `Tenant "${newTenant.name}" created successfully`
      })
      
      setNewTenant({ name: '', domain: '', bicCode: '', settings: {} })
      setShowCreateTenant(false)
      fetchTenants()
      
    } catch (error) {
      console.error('Error creating tenant:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Creating Tenant',
        message: error.response?.data?.message || 'Failed to create tenant',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      if (!selectedTenant) {
        setErrorModal({
          isOpen: true,
          title: 'Error',
          message: 'Please select a tenant first'
        })
        return
      }
      
      const response = await api.post(`/admin/tenants/${selectedTenant.id}/users/create`, newUser)
      
      setSuccessModal({
        isOpen: true,
        message: `User "${newUser.name}" created and assigned to tenant`
      })
      
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'user',
        tenantRole: 'user',
        permissions: []
      })
      setShowCreateUser(false)
      fetchTenantUsers(selectedTenant.id)
      
    } catch (error) {
      console.error('Error creating user:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Creating User',
        message: error.response?.data?.message || 'Failed to create user',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAssignUser = async (userId, role) => {
    try {
      setLoading(true)
      
      await api.post(`/admin/tenants/${selectedTenant.id}/users`, {
        userId,
        role,
        permissions: []
      })
      
      setSuccessModal({
        isOpen: true,
        message: 'User assigned to tenant successfully'
      })
      
      fetchTenantUsers(selectedTenant.id)
      
    } catch (error) {
      console.error('Error assigning user:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Assigning User',
        message: error.response?.data?.message || 'Failed to assign user to tenant'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user from the tenant?')) {
      return
    }
    
    try {
      setLoading(true)
      
      await api.delete(`/admin/tenants/${selectedTenant.id}/users/${userId}`)
      
      setSuccessModal({
        isOpen: true,
        message: 'User removed from tenant successfully'
      })
      
      fetchTenantUsers(selectedTenant.id)
      
    } catch (error) {
      console.error('Error removing user:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Removing User',
        message: error.response?.data?.message || 'Failed to remove user from tenant'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTenantClick = (tenant) => {
    setSelectedTenant(tenant)
    fetchTenantUsers(tenant.id)
  }

  const handleUpdateTenant = async (tenantId, updates) => {
    try {
      setLoading(true)
      
      await api.put(`/admin/tenants/${tenantId}`, updates)
      
      setSuccessModal({
        isOpen: true,
        message: 'Tenant updated successfully'
      })
      
      fetchTenants()
      
    } catch (error) {
      console.error('Error updating tenant:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Updating Tenant',
        message: error.response?.data?.message || 'Failed to update tenant'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTenant = async (tenantId) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return
    }
    
    try {
      setLoading(true)
      
      await api.delete(`/admin/tenants/${tenantId}`)
      
      setSuccessModal({
        isOpen: true,
        message: 'Tenant deleted successfully'
      })
      
      if (selectedTenant?.id === tenantId) {
        setSelectedTenant(null)
        setUsers([])
      }
      
      fetchTenants()
      
    } catch (error) {
      console.error('Error deleting tenant:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Deleting Tenant',
        message: error.response?.data?.message || 'Failed to delete tenant'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-mono">Tenant Management</h2>
            <p className="text-gray-600 font-mono">Manage multitenant architecture and user assignments</p>
          </div>
          <Button onClick={() => setShowCreateTenant(true)}>
            <i className="bi bi-plus-lg mr-2"></i>
            Create Tenant
          </Button>
        </div>

        {/* Tenants List */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Tenants</h3>
            
            {tenants.length === 0 ? (
              <div className="text-center py-8">
                <i className="bi bi-building text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-500 font-mono">No tenants found</p>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowCreateTenant(true)}
                  className="mt-4"
                >
                  Create First Tenant
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedTenant?.id === tenant.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTenantClick(tenant)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 font-mono">{tenant.name}</h4>
                        {tenant.domain && (
                          <p className="text-sm text-gray-600 font-mono">{tenant.domain}</p>
                        )}
                        {tenant.bic_code && (
                          <p className="text-sm text-gray-600 font-mono">{tenant.bic_code}</p>
                        )}
                      </div>
                      <Badge variant={tenant.is_active ? 'success' : 'secondary'}>
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500 font-mono">
                        {tenant.user_count} user{tenant.user_count !== 1 ? 's' : ''}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdateTenant(tenant.id, { 
                              isActive: !tenant.is_active 
                            })
                          }}
                        >
                          {tenant.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTenant(tenant.id)
                          }}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Selected Tenant Details */}
        {selectedTenant && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 font-mono">
                    {selectedTenant.name} - Users
                  </h3>
                  <p className="text-gray-600 font-mono">Manage users assigned to this tenant</p>
                </div>
                <Button onClick={() => setShowCreateUser(true)}>
                  <i className="bi bi-person-plus mr-2"></i>
                  Create User
                </Button>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-8">
                  <i className="bi bi-people text-4xl text-gray-400 mb-4"></i>
                  <p className="text-gray-500 font-mono">No users assigned to this tenant</p>
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowCreateUser(true)}
                    className="mt-4"
                  >
                    Create First User
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-mono text-sm font-medium text-gray-700">User</th>
                        <th className="text-left py-3 px-4 font-mono text-sm font-medium text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 font-mono text-sm font-medium text-gray-700">System Role</th>
                        <th className="text-left py-3 px-4 font-mono text-sm font-medium text-gray-700">Tenant Role</th>
                        <th className="text-left py-3 px-4 font-mono text-sm font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-mono text-sm font-medium text-gray-700">Assigned</th>
                        <th className="text-left py-3 px-4 font-mono text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900 font-mono">{user.name}</div>
                              <div className="text-sm text-gray-500 font-mono">ID: {user.id}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-gray-900 font-mono">{user.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={user.role === 'admin' ? 'warning' : 'info'}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={user.tenant_role === 'admin' ? 'warning' : 'success'}>
                              {user.tenant_role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                              {user.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-600 font-mono">
                              {new Date(user.assigned_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleRemoveUser(user.id)}
                            >
                              <i className="bi bi-person-dash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Create Tenant Modal */}
      {showCreateTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Create New Tenant</h3>
              
              <form onSubmit={handleCreateTenant} className="space-y-4">
                <Input
                  label="Tenant Name"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter tenant name"
                  required
                />
                
                <Input
                  label="Domain (Optional)"
                  value={newTenant.domain}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="tenant.example.com"
                />
                
                <Input
                  label="BIC Code (Optional)"
                  value={newTenant.bicCode}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, bicCode: e.target.value }))}
                  placeholder="BANKUS33XXX"
                />
                
                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Creating...' : 'Create Tenant'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setShowCreateTenant(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">
                Create User for {selectedTenant?.name}
              </h3>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <Input
                  label="User Name"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter user name"
                  required
                />
                
                <Input
                  label="Email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                />
                
                <Input
                  label="Password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-mono mb-2">
                    System Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  >
                    <option value="user">User</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-mono mb-2">
                    Tenant Role
                  </label>
                  <select
                    value={newUser.tenantRole}
                    onChange={(e) => setNewUser(prev => ({ ...prev, tenantRole: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  >
                    <option value="user">User</option>
                    <option value="admin">Tenant Admin</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setShowCreateUser(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Card>
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

export default TenantManagement
