import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'
import { Card, Button, Input, Badge } from '../../components/UIComponents'

const IPWhitelist = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  
  const [whitelist, setWhitelist] = useState([])
  const [accessLogs, setAccessLogs] = useState([])
  const [stats, setStats] = useState({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newIP, setNewIP] = useState('')
  const [description, setDescription] = useState('')
  const [currentIP, setCurrentIP] = useState('')

  useEffect(() => {
    fetchWhitelistData()
    fetchCurrentIP()
  }, [])

  const fetchWhitelistData = async () => {
    try {
      setLoading(true)
      const [whitelistResponse, logsResponse, statsResponse] = await Promise.all([
        api.get('/user/ip-whitelist'),
        api.get('/user/ip-whitelist/logs'),
        api.get('/user/ip-whitelist/stats')
      ])
      
      setWhitelist(whitelistResponse.data.whitelist || [])
      setAccessLogs(logsResponse.data.logs || [])
      setStats(statsResponse.data)
    } catch (error) {
      console.error('Error fetching whitelist data:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading IP Whitelist',
        message: error.response?.data?.message || 'Failed to load IP whitelist data',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      setCurrentIP(data.ip)
    } catch (error) {
      console.error('Error fetching current IP:', error)
    }
  }

  const addToWhitelist = async () => {
    try {
      setLoading(true)
      await api.post('/user/ip-whitelist', {
        ipAddress: newIP,
        description: description
      })
      
      setSuccessModal({
        isOpen: true,
        message: 'IP address added to whitelist successfully!'
      })
      
      setShowAddForm(false)
      setNewIP('')
      setDescription('')
      fetchWhitelistData()
    } catch (error) {
      console.error('Error adding IP to whitelist:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Adding IP',
        message: error.response?.data?.message || 'Failed to add IP to whitelist',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const removeFromWhitelist = async (whitelistId) => {
    try {
      setLoading(true)
      await api.delete(`/user/ip-whitelist/${whitelistId}`)
      
      setSuccessModal({
        isOpen: true,
        message: 'IP address removed from whitelist successfully!'
      })
      
      fetchWhitelistData()
    } catch (error) {
      console.error('Error removing IP from whitelist:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Removing IP',
        message: error.response?.data?.message || 'Failed to remove IP from whitelist',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (accessGranted) => {
    return accessGranted ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
  }

  const validateIP = (ip) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">IP Whitelist</h1>
            <p className="text-gray-600 font-mono">Manage allowed IP addresses for your account</p>
          </div>
          <div className="flex items-center gap-3">
            {currentIP && (
              <div className="text-sm text-gray-600 font-mono">
                Your IP: <span className="font-medium text-gray-900">{currentIP}</span>
              </div>
            )}
            <Button onClick={() => setShowAddForm(true)}>
              <i className="bi bi-plus-circle mr-2"></i>
              Add IP
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-mono">Total Entries</p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">{stats.totalEntries || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-list-ul text-blue-600"></i>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-mono">Active IPs</p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">{stats.activeEntries || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-check-circle text-green-600"></i>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-mono">Access Attempts</p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">{stats.totalAttempts || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-shield-check text-orange-600"></i>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-mono">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">
                    {stats.totalAttempts > 0 
                      ? Math.round((stats.successfulAttempts / stats.totalAttempts) * 100) 
                      : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-graph-up text-indigo-600"></i>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Add IP Form */}
        {showAddForm && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Add IP Address</h3>
              <div className="space-y-4">
                <Input
                  label="IP Address"
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  placeholder="192.168.1.1"
                  helper="Enter the IP address you want to whitelist"
                  error={newIP && !validateIP(newIP) ? 'Invalid IP address format' : ''}
                />
                
                <Input
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Office network, Home computer, etc."
                  helper="Optional description to help you identify this IP"
                />
                
                <div className="flex gap-3">
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewIP('')
                      setDescription('')
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={addToWhitelist}
                    disabled={loading || !newIP || !validateIP(newIP)}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle mr-2"></i>
                        Add IP
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Whitelist Entries */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Whitelisted IP Addresses</h3>
            
            {whitelist.length === 0 ? (
              <div className="text-center py-8">
                <i className="bi bi-shield-x text-gray-300 text-4xl mb-2"></i>
                <p className="text-sm text-gray-500 font-mono">No IP addresses whitelisted</p>
                <p className="text-xs text-gray-400 font-mono">Add your first IP address to enhance security</p>
              </div>
            ) : (
              <div className="space-y-3">
                {whitelist.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i className="bi bi-globe text-blue-600"></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 font-mono">{entry.ipAddress}</p>
                        {entry.description && (
                          <p className="text-sm text-gray-600 font-mono">{entry.description}</p>
                        )}
                        <p className="text-xs text-gray-500 font-mono">
                          Added {formatDate(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" size="sm">
                        Active
                      </Badge>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeFromWhitelist(entry.id)}
                        disabled={loading}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Access Logs */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 font-mono">Recent Access Logs</h3>
              <Button variant="secondary" onClick={fetchWhitelistData}>
                <i className="bi bi-arrow-clockwise mr-2"></i>
                Refresh
              </Button>
            </div>
            
            {accessLogs.length === 0 ? (
              <div className="text-center py-8">
                <i className="bi bi-clock-history text-gray-300 text-4xl mb-2"></i>
                <p className="text-sm text-gray-500 font-mono">No access logs available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">IP Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accessLogs.map((log, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {log.ipAddress}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={log.accessGranted ? 'success' : 'danger'} size="sm">
                            {log.accessGranted ? 'Allowed' : 'Blocked'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {log.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {formatDate(log.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Security Information */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Security Information</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 font-mono mb-2">How IP Whitelist Works</h4>
                <ul className="text-sm text-blue-800 font-mono space-y-1">
                  <li>• Only whitelisted IP addresses can access your account</li>
                  <li>• All access attempts are logged for security monitoring</li>
                  <li>• You can add or remove IP addresses at any time</li>
                  <li>• If no IPs are whitelisted, all IPs are allowed (default)</li>
                </ul>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 font-mono mb-2">⚠️ Important Notes</h4>
                <ul className="text-sm text-yellow-800 font-mono space-y-1">
                  <li>• Be careful when adding IP ranges - they allow access from multiple addresses</li>
                  <li>• Dynamic IP addresses may change frequently</li>
                  <li>• Keep your whitelist updated when your network changes</li>
                  <li>• Consider using VPN services for consistent IP addresses</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
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

export default IPWhitelist
