import React, { useState, useEffect } from 'react'
import api from '../utils/api'

const MessageStatusTrail = ({ messageId, compact = false }) => {
  const [statusTrail, setStatusTrail] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (messageId) {
      fetchStatusTrail()
    }
  }, [messageId])

  const fetchStatusTrail = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/messages/${messageId}/status-trail`)
      setStatusTrail(response.data.trail || [])
    } catch (err) {
      console.error('Error fetching status trail:', err)
      setError(err.response?.data?.message || 'Failed to load status trail')
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

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800 border-gray-200',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'sent': 'bg-blue-100 text-blue-800 border-blue-200',
      'acknowledged': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'processing': 'bg-orange-100 text-orange-800 border-orange-200',
      'completed': 'bg-green-100 text-green-800 border-green-200',
      'failed': 'bg-red-100 text-red-800 border-red-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200',
      'cancelled': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getIconColor = (status) => {
    const colors = {
      'draft': 'text-gray-500',
      'pending': 'text-yellow-600',
      'sent': 'text-blue-600',
      'acknowledged': 'text-indigo-600',
      'processing': 'text-orange-600',
      'completed': 'text-green-600',
      'failed': 'text-red-600',
      'rejected': 'text-red-600',
      'cancelled': 'text-gray-500'
    }
    return colors[status] || 'text-gray-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <i className="bi bi-exclamation-triangle text-red-500 text-xl mb-2"></i>
        <p className="text-sm text-red-600 font-mono">{error}</p>
      </div>
    )
  }

  if (statusTrail.length === 0) {
    return (
      <div className="text-center py-4">
        <i className="bi bi-info-circle text-gray-400 text-xl mb-2"></i>
        <p className="text-sm text-gray-500 font-mono">No status updates available</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {statusTrail.map((status, index) => (
          <React.Fragment key={status.id}>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium font-mono ${getStatusColor(status.status)}`}>
              <i className={`bi ${status.statusInfo?.icon || 'bi-circle'} ${getIconColor(status.status)}`}></i>
              {status.status_label}
            </div>
            {index < statusTrail.length - 1 && (
              <i className="bi bi-chevron-right text-gray-400 text-xs"></i>
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <i className="bi bi-activity text-blue-600"></i>
        <h3 className="text-lg font-semibold text-gray-900 font-mono">Status Trail</h3>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        <div className="space-y-4">
          {statusTrail.map((status, index) => (
            <div key={status.id} className="flex items-start gap-4">
              {/* Status indicator */}
              <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(status.status)} border-2 border-white shadow-sm`}>
                <i className={`bi ${status.statusInfo?.icon || 'bi-circle'} ${getIconColor(status.status)}`}></i>
              </div>

              {/* Status content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900 font-mono">{status.status_label}</h4>
                  <span className="text-xs text-gray-500 font-mono">{formatDate(status.created_at)}</span>
                </div>
                
                <p className="text-sm text-gray-600 font-mono mb-2">{status.description}</p>

                {/* Show metadata if available */}
                {status.metadata && Object.keys(status.metadata).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-medium text-gray-700 font-mono mb-2">Details:</div>
                    <div className="space-y-1">
                      {Object.entries(status.metadata).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600 font-mono capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="text-xs text-gray-800 font-mono">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show progress indicator */}
                {index < statusTrail.length - 1 && (
                  <div className="mt-2 text-xs text-gray-500 font-mono">
                    <i className="bi bi-arrow-down"></i> Next: {statusTrail[index + 1].status_label}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current status highlight */}
      {statusTrail.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <i className="bi bi-info-circle text-blue-600"></i>
            <span className="text-sm font-medium text-blue-900 font-mono">Current Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium font-mono ${getStatusColor(statusTrail[statusTrail.length - 1].status)}`}>
              {statusTrail[statusTrail.length - 1].status_label}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageStatusTrail
