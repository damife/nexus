import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'
import { Card, Button, Badge } from '../../components/UIComponents'
import { LineChart, BarChart, PieChart, ProgressRing, MiniChart } from '../../components/Charts'

const UserHomeEnhanced = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  
  const [dashboardData, setDashboardData] = useState({
    bankInfo: null,
    stats: {},
    messageHistory: [],
    recentActivity: [],
    balance: 0
  })

  const [timeRange, setTimeRange] = useState('7d')

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [bankResponse, statsResponse, historyResponse, balanceResponse] = await Promise.all([
        api.get('/user/bank-info'),
        api.get('/user/stats'),
        api.get(`/user/message-history?limit=10`),
        api.get('/user/balance')
      ])
      
      setDashboardData({
        bankInfo: bankResponse.data.bank,
        stats: statsResponse.data,
        messageHistory: historyResponse.data.messages || [],
        balance: balanceResponse.data.balance || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Dashboard',
        message: error.response?.data?.message || 'Failed to load dashboard data',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0)
  }

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'text-green-600 bg-green-50',
      'pending': 'text-yellow-600 bg-yellow-50',
      'failed': 'text-red-600 bg-red-50',
      'sent': 'text-blue-600 bg-blue-50',
      'draft': 'text-gray-600 bg-gray-50'
    }
    return colors[status] || 'text-gray-600 bg-gray-50'
  }

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'MT103': return 'bi-cash-stack'
      case 'MT202': return 'bi-bank'
      case 'MT940': return 'bi-file-text'
      default: return 'bi-envelope'
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">User Dashboard</h1>
            <p className="text-gray-600 font-mono">Welcome back! Here's your SWIFT messaging overview</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <Button onClick={() => navigate('/user/message/new')}>
              <i className="bi bi-plus-circle mr-2"></i>
              New Message
            </Button>
          </div>
        </div>

        {/* Balance & Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card hover className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <i className="bi bi-wallet2 text-2xl"></i>
                <Badge variant="secondary" size="sm" className="bg-white/20 text-white">
                  Available
                </Badge>
              </div>
              <h3 className="text-2xl font-bold font-mono">
                {formatCurrency(dashboardData.balance)}
              </h3>
              <p className="text-sm opacity-90 font-mono">Current Balance</p>
            </div>
          </Card>

          <Card hover>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-send text-green-600 text-xl"></i>
                </div>
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 font-mono">
                {formatNumber(dashboardData.stats.totalMessages)}
              </h3>
              <p className="text-sm text-gray-600 font-mono">Total Messages</p>
              <div className="mt-4">
                <MiniChart 
                  data={[12, 19, 15, 25, 22, 30, 28]} 
                  type="line" 
                  color="#10B981" 
                  height={40} 
                />
              </div>
            </div>
          </Card>

          <Card hover>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-check-circle text-blue-600 text-xl"></i>
                </div>
                <ProgressRing 
                  value={dashboardData.stats.totalMessages > 0 ? (dashboardData.stats.completed / dashboardData.stats.totalMessages) * 100 : 0} 
                  size={48} 
                  color="#3B82F6" 
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 font-mono">
                {formatNumber(dashboardData.stats.completed)}
              </h3>
              <p className="text-sm text-gray-600 font-mono">Completed</p>
            </div>
          </Card>

          <Card hover>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-clock text-orange-600 text-xl"></i>
                </div>
                <Badge variant="warning" size="sm">
                  Pending
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 font-mono">
                {formatNumber(dashboardData.stats.pending)}
              </h3>
              <p className="text-sm text-gray-600 font-mono">In Progress</p>
            </div>
          </Card>
        </div>

        {/* Bank Information */}
        {dashboardData.bankInfo && (
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-building text-blue-600 text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 font-mono">Bank Information</h3>
                  <p className="text-sm text-gray-600 font-mono">Your assigned institution details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <i className="bi bi-building text-gray-400"></i>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 font-mono mb-1">Institution</div>
                    <div className="text-sm font-semibold text-gray-900 font-mono">{dashboardData.bankInfo.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <i className="bi bi-upc-scan text-gray-400"></i>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 font-mono mb-1">BIC Code</div>
                    <div className="text-sm font-semibold text-gray-900 font-mono">{dashboardData.bankInfo.bic || 'N/A'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <i className="bi bi-hash text-gray-400"></i>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 font-mono mb-1">Customer Number</div>
                    <div className="text-sm font-semibold text-gray-900 font-mono">{dashboardData.bankInfo.customer_number || 'N/A'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <i className="bi bi-geo-alt text-gray-400"></i>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 font-mono mb-1">Location</div>
                    <div className="text-sm font-semibold text-gray-900 font-mono">{dashboardData.bankInfo.country || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Activity Chart */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Message Activity</h3>
              <LineChart 
                data={[8, 12, 15, 10, 18, 14, 20, 16, 22, 19, 25, 28]}
                labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
                color="#3B82F6"
                height={250}
              />
            </div>
          </Card>

          {/* Message Type Distribution */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Message Types</h3>
              <PieChart 
                data={[45, 25, 20, 10]}
                labels={['MT103', 'MT202', 'MT940', 'Others']}
                colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444']}
                height={250}
              />
            </div>
          </Card>
        </div>

        {/* Recent Messages */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 font-mono">Recent Messages</h3>
              <Button variant="secondary" onClick={() => navigate('/user/history')}>
                <i className="bi bi-arrow-right mr-2"></i>
                View All
              </Button>
            </div>
            
            {dashboardData.messageHistory.length === 0 ? (
              <div className="text-center py-8">
                <i className="bi bi-envelope-x text-gray-300 text-4xl mb-2"></i>
                <p className="text-sm text-gray-500 font-mono">No messages yet</p>
                <p className="text-xs text-gray-400 font-mono">Create your first SWIFT message to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Receiver</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.messageHistory.map((message) => (
                      <tr key={message.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <i className={`bi ${getMessageTypeIcon(message.message_type)} text-blue-600`}></i>
                            <span className="text-sm font-medium text-gray-900 font-mono">{message.message_type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {message.receiver_bic || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {message.amount ? `${message.currency} ${parseFloat(message.amount).toLocaleString()}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={message.status === 'completed' ? 'success' : message.status === 'failed' ? 'danger' : 'warning'} size="sm">
                            {message.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {formatDate(message.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button onClick={() => navigate('/user/message/new')} className="w-full">
                <i className="bi bi-plus-circle mr-2"></i>
                New Message
              </Button>
              <Button variant="secondary" onClick={() => navigate('/user/drafts')} className="w-full">
                <i className="bi bi-file-earmark-text mr-2"></i>
                View Drafts
              </Button>
              <Button variant="secondary" onClick={() => navigate('/user/history')} className="w-full">
                <i className="bi bi-clock-history mr-2"></i>
                Message History
              </Button>
              <Button variant="secondary" onClick={() => navigate('/user/profile')} className="w-full">
                <i className="bi bi-person mr-2"></i>
                Profile Settings
              </Button>
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

export default UserHomeEnhanced
