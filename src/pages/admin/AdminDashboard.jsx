import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'
import { Card, Button, Badge, Input } from '../../components/UIComponents'
import { LineChart, BarChart, PieChart, ProgressRing, MiniChart } from '../../components/Charts'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  
  const [dashboardData, setDashboardData] = useState({
    overview: {},
    messageStats: {},
    userStats: {},
    financialStats: {},
    systemHealth: {},
    recentActivity: []
  })

  const [timeRange, setTimeRange] = useState('7d')
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [balanceForm, setBalanceForm] = useState({
    userId: '',
    amount: '',
    type: 'add',
    description: ''
  })
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchDashboardData()
    fetchUsers()
  }, [timeRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/analytics?timeRange=${timeRange}`)
      setDashboardData(response.data)
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

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users')
      setUsers(response.data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleBalanceUpdate = async () => {
    try {
      setLoading(true)
      await api.post('/admin/users/balance', balanceForm)
      
      setSuccessModal({
        isOpen: true,
        message: `Balance ${balanceForm.type === 'add' ? 'added to' : 'deducted from'} user successfully!`
      })
      
      setShowBalanceModal(false)
      setBalanceForm({ userId: '', amount: '', type: 'add', description: '' })
      fetchDashboardData()
    } catch (error) {
      console.error('Error updating balance:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Updating Balance',
        message: error.response?.data?.message || 'Failed to update user balance',
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

  const getTrendIcon = (trend) => {
    if (trend > 0) return 'bi-arrow-up text-green-600'
    if (trend < 0) return 'bi-arrow-down text-red-600'
    return 'bi-dash text-gray-600'
  }

  const getStatusColor = (status) => {
    const colors = {
      'healthy': 'text-green-600 bg-green-50',
      'warning': 'text-yellow-600 bg-yellow-50',
      'critical': 'text-red-600 bg-red-50',
      'info': 'text-blue-600 bg-blue-50'
    }
    return colors[status] || 'text-gray-600 bg-gray-50'
  }

  if (loading && !dashboardData.overview.totalMessages) {
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
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Admin Dashboard</h1>
            <p className="text-gray-600 font-mono">System overview and management</p>
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
              <option value="90d">Last 90 Days</option>
            </select>
            <Button onClick={() => setShowBalanceModal(true)}>
              <i className="bi bi-wallet2 mr-2"></i>
              Manage Balance
            </Button>
            <Button onClick={() => navigate('/admin/analytics')}>
              <i className="bi bi-graph-up mr-2"></i>
              Full Analytics
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card hover className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-envelope text-blue-600 text-xl"></i>
                </div>
                <Badge variant="info" size="sm">
                  <i className={`bi ${getTrendIcon(dashboardData.overview.messageTrend || 0)}`}></i>
                  {Math.abs(dashboardData.overview.messageTrend || 0)}%
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 font-mono">
                {formatNumber(dashboardData.overview.totalMessages)}
              </h3>
              <p className="text-sm text-gray-600 font-mono">Total Messages</p>
              <div className="mt-4">
                <MiniChart 
                  data={[45, 52, 38, 65, 48, 72, 58]} 
                  type="line" 
                  color="#3B82F6" 
                  height={40} 
                />
              </div>
            </div>
          </Card>

          <Card hover className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-people text-green-600 text-xl"></i>
                </div>
                <Badge variant="success" size="sm">
                  <i className={`bi ${getTrendIcon(dashboardData.overview.userTrend || 0)}`}></i>
                  {Math.abs(dashboardData.overview.userTrend || 0)}%
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 font-mono">
                {formatNumber(dashboardData.overview.activeUsers)}
              </h3>
              <p className="text-sm text-gray-600 font-mono">Active Users</p>
              <div className="mt-4">
                <MiniChart 
                  data={[30, 35, 32, 42, 38, 45, 40]} 
                  type="bar" 
                  color="#10B981" 
                  height={40} 
                />
              </div>
            </div>
          </Card>

          <Card hover className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-currency-dollar text-orange-600 text-xl"></i>
                </div>
                <Badge variant="warning" size="sm">
                  <i className={`bi ${getTrendIcon(dashboardData.overview.revenueTrend || 0)}`}></i>
                  {Math.abs(dashboardData.overview.revenueTrend || 0)}%
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 font-mono">
                {formatCurrency(dashboardData.overview.totalRevenue)}
              </h3>
              <p className="text-sm text-gray-600 font-mono">Total Revenue</p>
              <div className="mt-4">
                <MiniChart 
                  data={[25, 30, 28, 35, 32, 38, 35]} 
                  type="line" 
                  color="#F59E0B" 
                  height={40} 
                />
              </div>
            </div>
          </Card>

          <Card hover>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-check-circle text-indigo-600 text-xl"></i>
                </div>
                <ProgressRing 
                  value={dashboardData.overview.successRate * 100 || 0} 
                  size={48} 
                  color="#6366F1" 
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 font-mono">
                {Math.round((dashboardData.overview.successRate || 0) * 100)}%
              </h3>
              <p className="text-sm text-gray-600 font-mono">Success Rate</p>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Volume Chart */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Message Volume Trends</h3>
              <LineChart 
                data={[45, 52, 38, 65, 48, 72, 58, 65, 72, 68, 75, 82]}
                labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
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
                data={[120, 85, 45, 30]}
                labels={['MT103', 'MT202', 'MT940', 'MX']}
                colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444']}
                height={250}
              />
            </div>
          </Card>
        </div>

        {/* System Health & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">API Response</span>
                  <Badge variant={dashboardData.systemHealth.apiStatus || 'info'} size="sm">
                    {dashboardData.systemHealth.apiResponseTime || 'N/A'}ms
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Database</span>
                  <Badge variant={dashboardData.systemHealth.dbStatus || 'info'} size="sm">
                    {dashboardData.systemHealth.dbStatus || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Email Service</span>
                  <Badge variant={dashboardData.systemHealth.emailStatus || 'info'} size="sm">
                    {dashboardData.systemHealth.emailStatus || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Crypto Service</span>
                  <Badge variant={dashboardData.systemHealth.cryptoStatus || 'info'} size="sm">
                    {dashboardData.systemHealth.cryptoStatus || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* User Activity */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">User Activity</h3>
              <BarChart 
                data={[65, 48, 72, 58, 45, 52, 38]}
                labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                colors={['#10B981']}
                height={200}
              />
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 font-mono">Recent Activity</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500 font-mono">Live</span>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dashboardData.realTimeData?.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'message' ? 'bg-blue-500' :
                        activity.type === 'user' ? 'bg-green-500' :
                        activity.type === 'system' ? 'bg-orange-500' : 'bg-gray-500'
                      }`}></div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 font-mono">{activity.title}</p>
                        <p className="text-xs text-gray-500 font-mono">{activity.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Financial Overview */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Financial Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 font-mono mb-2">Total Volume</p>
                <p className="text-xl font-bold text-gray-900 font-mono">
                  {formatCurrency(dashboardData.financialStats?.totalVolume)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 font-mono mb-2">Avg Transaction</p>
                <p className="text-xl font-bold text-gray-900 font-mono">
                  {formatCurrency(dashboardData.financialStats?.avgTransactionSize)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 font-mono mb-2">Crypto Deposits</p>
                <p className="text-xl font-bold text-gray-900 font-mono">
                  {formatCurrency(dashboardData.financialStats?.cryptoDeposits)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 font-mono mb-2">Fees Collected</p>
                <p className="text-xl font-bold text-gray-900 font-mono">
                  {formatCurrency(dashboardData.financialStats?.feesCollected)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Balance Management Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-[90%] shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 font-mono">Manage User Balance</h2>
              <button 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowBalanceModal(false)}
              >
                <i className="bi bi-x text-xl"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-mono mb-1">Select User</label>
                  <select
                    value={balanceForm.userId}
                    onChange={(e) => setBalanceForm({...balanceForm, userId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  >
                    <option value="">Choose a user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) - Balance: ${user.balance || 0}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-mono mb-1">Action</label>
                  <select
                    value={balanceForm.type}
                    onChange={(e) => setBalanceForm({...balanceForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  >
                    <option value="add">Add Balance</option>
                    <option value="deduct">Deduct Balance</option>
                  </select>
                </div>
                
                <Input
                  type="number"
                  label="Amount"
                  value={balanceForm.amount}
                  onChange={(e) => setBalanceForm({...balanceForm, amount: e.target.value})}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-mono mb-1">Description</label>
                  <textarea
                    value={balanceForm.description}
                    onChange={(e) => setBalanceForm({...balanceForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
                    rows={3}
                    placeholder="Reason for balance adjustment..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button 
                  variant="secondary"
                  onClick={() => setShowBalanceModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBalanceUpdate}
                  disabled={loading || !balanceForm.userId || !balanceForm.amount}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle mr-2"></i>
                      {balanceForm.type === 'add' ? 'Add' : 'Deduct'} Balance
                    </>
                  )}
                </Button>
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

export default AdminDashboard
