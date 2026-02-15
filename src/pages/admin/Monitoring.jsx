import React, { useState, useEffect } from 'react'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'

const Monitoring = () => {
  const [metrics, setMetrics] = useState({
    api: { status: 'checking', latency: 0, uptime: 0 },
    database: { status: 'checking', latency: 0, connections: 0 },
    kafka: { status: 'checking', consumers: 0, producers: 0, topics: [] },
    rabbitmq: { status: 'checking', queues: 0, messages: 0 },
    system: { cpu: 0, memory: 0, disk: 0 },
    processing: { total: 0, success: 0, failed: 0, pending: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(() => {
      fetchMetrics()
      setLastUpdate(new Date())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/admin/monitoring')
      if (response.data) {
        setMetrics(response.data)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
      if (loading) {
        setErrorModal({
          isOpen: true,
          title: 'Error Loading Metrics',
          message: error.response?.data?.message || 'Failed to load system metrics',
          errors: error.response?.data?.errors || []
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'connected':
      case 'online':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'warning':
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'error':
      case 'disconnected':
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'connected':
      case 'online':
        return 'bi-check-circle-fill text-green-600'
      case 'warning':
      case 'degraded':
        return 'bi-exclamation-triangle-fill text-yellow-600'
      case 'error':
      case 'disconnected':
      case 'offline':
        return 'bi-x-circle-fill text-red-600'
      default:
        return 'bi-clock text-gray-600'
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono">System Monitoring</h1>
            <p className="text-gray-600 font-mono mt-1">Real-time system health and performance metrics</p>
          </div>
          <div className="text-sm text-gray-500 font-mono">
            Last updated: {lastUpdate.toLocaleTimeString()}
            <button
              onClick={fetchMetrics}
              className="ml-4 text-blue-600 hover:text-blue-700"
              title="Refresh"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 font-mono">API Health</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(metrics.api.status)}`}>
                {metrics.api.status || 'Checking'}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Latency:</span>
                <span className="font-semibold text-gray-900">{metrics.api.latency}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Uptime:</span>
                <span className="font-semibold text-gray-900">{metrics.api.uptime}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 font-mono">Database</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(metrics.database.status)}`}>
                {metrics.database.status || 'Checking'}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Latency:</span>
                <span className="font-semibold text-gray-900">{metrics.database.latency}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Connections:</span>
                <span className="font-semibold text-gray-900">{metrics.database.connections}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 font-mono">Kafka</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(metrics.kafka.status)}`}>
                {metrics.kafka.status || 'Checking'}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Consumers:</span>
                <span className="font-semibold text-gray-900">{metrics.kafka.consumers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Producers:</span>
                <span className="font-semibold text-gray-900">{metrics.kafka.producers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Topics:</span>
                <span className="font-semibold text-gray-900">{metrics.kafka.topics?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 font-mono">RabbitMQ</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(metrics.rabbitmq.status)}`}>
                {metrics.rabbitmq.status || 'Checking'}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Queues:</span>
                <span className="font-semibold text-gray-900">{metrics.rabbitmq.queues}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Messages:</span>
                <span className="font-semibold text-gray-900">{metrics.rabbitmq.messages}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">System Resources</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">CPU:</span>
                  <span className="font-semibold text-gray-900">{metrics.system.cpu}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${metrics.system.cpu > 80 ? 'bg-red-500' : metrics.system.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${metrics.system.cpu}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Memory:</span>
                  <span className="font-semibold text-gray-900">{metrics.system.memory}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${metrics.system.memory > 80 ? 'bg-red-500' : metrics.system.memory > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${metrics.system.memory}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Disk:</span>
                  <span className="font-semibold text-gray-900">{metrics.system.disk}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${metrics.system.disk > 80 ? 'bg-red-500' : metrics.system.disk > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${metrics.system.disk}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Processing Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Messages:</span>
                <span className="font-semibold text-gray-900">{metrics.processing.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Successful:</span>
                <span className="font-semibold text-green-600">{metrics.processing.success}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Failed:</span>
                <span className="font-semibold text-red-600">{metrics.processing.failed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pending:</span>
                <span className="font-semibold text-yellow-600">{metrics.processing.pending}</span>
              </div>
              {metrics.processing.total > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="font-semibold text-gray-900">
                      {((metrics.processing.success / metrics.processing.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        message={errorModal.message}
        errors={errorModal.errors}
      />
    </>
  )
}

export default Monitoring

