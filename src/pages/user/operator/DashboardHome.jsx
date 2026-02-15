import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../utils/api'
import ErrorModal from '../../../components/ErrorModal'

const DashboardHome = () => {
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })

  useEffect(() => {
    fetchDashboardData()
    fetchAlerts()
    const interval = setInterval(() => {
      fetchDashboardData()
      fetchAlerts()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/messages/dashboard/stats')
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Dashboard',
        message: error.response?.data?.message || 'Failed to load dashboard statistics',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/messages/alerts/list?resolved=false')
      setAlerts(response.data.alerts || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'sent': '#10b981',
      'completed': '#10b981',
      'pending': '#f59e0b',
      'ready_to_send': '#3b82f6',
      'authorized': '#8b5cf6',
      'waiting_authorization': '#f59e0b',
      'in_repair': '#ef4444',
      'ack': '#10b981',
      'nak': '#ef4444',
      'failed': '#ef4444',
      'rejected': '#ef4444'
    }
    return colors[status] || '#6b7280'
  }

  const formatStatus = (status) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getAlertIcon = (severity) => {
    const icons = {
      'critical': 'exclamation-triangle-fill',
      'warning': 'exclamation-circle-fill',
      'info': 'info-circle-fill'
    }
    return icons[severity] || 'info-circle'
  }

  const getAlertColor = (severity) => {
    const colors = {
      'critical': 'bg-red-100 text-red-800 border-red-200',
      'warning': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'info': 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return colors[severity] || 'bg-gray-100 text-gray-800 border-gray-200'
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
          <p className="text-gray-600 font-mono">High-level overview of messaging operations</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 font-mono mb-4 flex items-center gap-2">
            <i className="bi bi-envelope-paper text-blue-600"></i>
            Transaction Counts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-arrow-up-circle text-blue-600 text-xl"></i>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats?.messages?.outbound || 0}</div>
              <div className="text-sm text-gray-600 font-mono">Outbound (Sent)</div>
              <div className="text-xs text-gray-500 font-mono mt-1">Today</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-arrow-down-circle text-green-600 text-xl"></i>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats?.messages?.inbound || 0}</div>
              <div className="text-sm text-gray-600 font-mono">Inbound (Received)</div>
              <div className="text-xs text-gray-500 font-mono mt-1">Today</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-envelope-paper-fill text-purple-600 text-xl"></i>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats?.messages?.total || 0}</div>
              <div className="text-sm text-gray-600 font-mono">Total Messages</div>
              <div className="text-xs text-gray-500 font-mono mt-1">Today</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-clock-history text-orange-600 text-xl"></i>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 font-mono mb-1">{stats?.messages?.lastHour || 0}</div>
              <div className="text-sm text-gray-600 font-mono">Last Hour</div>
              <div className="text-xs text-gray-500 font-mono mt-1">Session Activity</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 font-mono mb-4 flex items-center gap-2">
              <i className="bi bi-pie-chart text-blue-600"></i>
              Status Breakdown
            </h2>
            <div className="space-y-3">
              {stats?.statusBreakdown?.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm font-mono">
                    <span className="text-gray-700">{formatStatus(item.status)}</span>
                    <span className="font-semibold text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all"
                      style={{ 
                        width: `${(item.count / (stats?.messages?.total || 1)) * 100}%`,
                        backgroundColor: getStatusColor(item.status)
                      }}
                    ></div>
                  </div>
                </div>
              ))}
              {(!stats?.statusBreakdown || stats.statusBreakdown.length === 0) && (
                <div className="text-center py-8 text-gray-500 font-mono">No messages yet</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 font-mono mb-4 flex items-center gap-2">
              <i className="bi bi-exclamation-triangle text-yellow-600"></i>
              Alerts & Notifications
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts.length > 0 ? (
                alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <i className={`bi ${getAlertIcon(alert.severity)} text-lg flex-shrink-0`}></i>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium font-mono mb-1">{alert.message}</div>
                        <div className="text-xs opacity-75 font-mono">{new Date(alert.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <i className="bi bi-check-circle text-green-500 text-3xl mb-2"></i>
                  <p className="text-gray-500 font-mono">No alerts at this time</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {stats?.queueHealth && stats.queueHealth.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 font-mono mb-4 flex items-center gap-2">
              <i className="bi bi-list-ul text-blue-600"></i>
              Queue Health
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.queueHealth.map((queue, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 font-mono">{queue.name}</h3>
                    <span className="text-sm text-gray-600 font-mono">{queue.size} items</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <i className="bi bi-hourglass-split"></i>
                    <span className="font-mono">Avg Processing: {Math.round(queue.avgProcessingTime || 0)}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <Link to="/user/queue" className="btn btn-primary flex-1">
            <i className="bi bi-list-ul"></i>
            View Message Queue
          </Link>
          <Link to="/user/message/new" className="btn btn-secondary flex-1">
            <i className="bi bi-plus-circle"></i>
            Create New Message
          </Link>
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

export default DashboardHome
