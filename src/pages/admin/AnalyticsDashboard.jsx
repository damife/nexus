import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'
import { Card, Badge, Button, Spinner } from '../../components/UIComponents'

const AnalyticsDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  
  const [analytics, setAnalytics] = useState({
    overview: {},
    messageStats: {},
    userActivity: {},
    financialStats: {},
    systemHealth: {},
    realTimeData: []
  })

  const [timeRange, setTimeRange] = useState('7d')
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds

  useEffect(() => {
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, refreshInterval)
    return () => clearInterval(interval)
  }, [timeRange, refreshInterval])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/analytics?timeRange=${timeRange}`)
      setAnalytics(response.data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Analytics',
        message: error.response?.data?.message || 'Failed to load analytics data',
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

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(2)}%`
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

  const getTrendIcon = (trend) => {
    if (trend > 0) return 'bi-arrow-up text-green-600'
    if (trend < 0) return 'bi-arrow-down text-red-600'
    return 'bi-dash text-gray-600'
  }

  if (loading && !analytics.overview.totalMessages) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600 font-mono">Real-time monitoring and insights</p>
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
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            >
              <option value="10000">10s</option>
              <option value="30000">30s</option>
              <option value="60000">1m</option>
              <option value="300000">5m</option>
            </select>
            <Button onClick={fetchAnalytics} disabled={loading}>
              {loading ? <Spinner size="sm" /> : <i className="bi bi-arrow-clockwise"></i>}
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card hover>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-envelope text-blue-600 text-xl"></i>
                </div>
                <Badge variant="info" size="sm">
                  <i className={`bi ${getTrendIcon(analytics.overview.messageTrend || 0)}`}></i>
                  {Math.abs(analytics.overview.messageTrend || 0)}%
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 font-mono">
                {formatNumber(analytics.overview.totalMessages)}
              </h3>
              <p className="text-sm text-gray-600 font-mono">Total Messages</p>
            </div>
          </Card>

          <Card hover>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-check-circle text-green-600 text-xl"></i>
                </div>
                <Badge variant="success" size="sm">
                  {formatPercentage(analytics.overview.successRate || 0)}
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 font-mono">
                {formatNumber(analytics.overview.successfulMessages)}
              </h3>
              <p className="text-sm text-gray-600 font-mono">Successful Messages</p>
            </div>
          </Card>

          <Card hover>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-people text-orange-600 text-xl"></i>
                </div>
                <Badge variant="warning" size="sm">
                  <i className={`bi ${getTrendIcon(analytics.overview.userTrend || 0)}`}></i>
                  {Math.abs(analytics.overview.userTrend || 0)}%
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 font-mono">
                {formatNumber(analytics.overview.activeUsers)}
              </h3>
              <p className="text-sm text-gray-600 font-mono">Active Users</p>
            </div>
          </Card>

          <Card hover>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-currency-dollar text-indigo-600 text-xl"></i>
                </div>
                <Badge variant="primary" size="sm">
                  <i className={`bi ${getTrendIcon(analytics.overview.revenueTrend || 0)}`}></i>
                  {Math.abs(analytics.overview.revenueTrend || 0)}%
                </Badge>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 font-mono">
                {formatCurrency(analytics.overview.totalRevenue)}
              </h3>
              <p className="text-sm text-gray-600 font-mono">Total Revenue</p>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Volume Chart */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Message Volume Trends</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-center">
                  <i className="bi bi-graph-up text-gray-400 text-4xl mb-2"></i>
                  <p className="text-sm text-gray-500 font-mono">Chart visualization would go here</p>
                  <p className="text-xs text-gray-400 font-mono">Integration with Chart.js or D3.js</p>
                </div>
              </div>
            </div>
          </Card>

          {/* User Activity Chart */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">User Activity Patterns</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-center">
                  <i className="bi bi-bar-chart text-gray-400 text-4xl mb-2"></i>
                  <p className="text-sm text-gray-500 font-mono">User activity heatmap</p>
                  <p className="text-xs text-gray-400 font-mono">Peak usage times and patterns</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* System Health & Real-time Data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">API Response Time</span>
                  <Badge variant={analytics.systemHealth.apiStatus || 'info'} size="sm">
                    {analytics.systemHealth.apiResponseTime || 'N/A'}ms
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Database</span>
                  <Badge variant={analytics.systemHealth.dbStatus || 'info'} size="sm">
                    {analytics.systemHealth.dbStatus || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Email Service</span>
                  <Badge variant={analytics.systemHealth.emailStatus || 'info'} size="sm">
                    {analytics.systemHealth.emailStatus || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Crypto Service</span>
                  <Badge variant={analytics.systemHealth.cryptoStatus || 'info'} size="sm">
                    {analytics.systemHealth.cryptoStatus || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Memory Usage</span>
                  <Badge variant="info" size="sm">
                    {analytics.systemHealth.memoryUsage || 'N/A'}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">CPU Usage</span>
                  <Badge variant="info" size="sm">
                    {analytics.systemHealth.cpuUsage || 'N/A'}%
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 font-mono">Real-time Activity</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500 font-mono">Live</span>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analytics.realTimeData?.length > 0 ? (
                  analytics.realTimeData.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'message' ? 'bg-blue-500' :
                          activity.type === 'user' ? 'bg-green-500' :
                          activity.type === 'system' ? 'bg-orange-500' : 'bg-gray-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 font-mono">{activity.title}</p>
                          <p className="text-xs text-gray-500 font-mono">{activity.description}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <i className="bi bi-activity text-gray-300 text-3xl mb-2"></i>
                    <p className="text-sm text-gray-500 font-mono">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Statistics */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Message Statistics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 font-mono">MT103</span>
                    <span className="text-sm font-medium text-gray-900 font-mono">
                      {formatNumber(analytics.messageStats.mt103 || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(analytics.messageStats.mt103 || 0) / (analytics.overview.totalMessages || 1) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 font-mono">MT202</span>
                    <span className="text-sm font-medium text-gray-900 font-mono">
                      {formatNumber(analytics.messageStats.mt202 || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(analytics.messageStats.mt202 || 0) / (analytics.overview.totalMessages || 1) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 font-mono">MT940</span>
                    <span className="text-sm font-medium text-gray-900 font-mono">
                      {formatNumber(analytics.messageStats.mt940 || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full" 
                      style={{ width: `${(analytics.messageStats.mt940 || 0) / (analytics.overview.totalMessages || 1) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 font-mono">MX Messages</span>
                    <span className="text-sm font-medium text-gray-900 font-mono">
                      {formatNumber(analytics.messageStats.mx || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ width: `${(analytics.messageStats.mx || 0) / (analytics.overview.totalMessages || 1) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Financial Statistics */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Financial Statistics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Total Transaction Volume</span>
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {formatCurrency(analytics.financialStats.totalVolume)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Average Transaction Size</span>
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {formatCurrency(analytics.financialStats.avgTransactionSize)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Crypto Deposits</span>
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {formatCurrency(analytics.financialStats.cryptoDeposits)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Fees Collected</span>
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {formatCurrency(analytics.financialStats.feesCollected)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-mono">Pending Transactions</span>
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {formatNumber(analytics.financialStats.pendingTransactions)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
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

export default AnalyticsDashboard
