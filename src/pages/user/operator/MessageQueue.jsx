import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../utils/api'
import ErrorModal from '../../../components/ErrorModal'
import ConfirmModal from '../../../components/ConfirmModal'
import SuccessModal from '../../../components/SuccessModal'

const MessageQueue = () => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    messageType: '',
    page: 1,
    limit: 50,
    sortBy: 'created_at',
    sortOrder: 'DESC'
  })
  const [pagination, setPagination] = useState({})
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })

  const navigate = useNavigate()

  useEffect(() => {
    fetchMessages()
  }, [filters])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        ...filters,
        page: filters.page.toString(),
        limit: filters.limit.toString()
      })

      const response = await api.get(`/messages/queue?${params}`)

      setMessages(response.data.messages || [])
      setPagination(response.data.pagination || {})
    } catch (error) {
      console.error('Error fetching messages:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Messages',
        message: error.response?.data?.message || 'Failed to load messages',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'DESC' ? 'ASC' : 'DESC'
    }))
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      'ready_to_send': { label: 'Ready to Send', classes: 'bg-blue-100 text-blue-800 border-blue-300' },
      'authorized': { label: 'Authorized', classes: 'bg-purple-100 text-purple-800 border-purple-300' },
      'sent': { label: 'Sent', classes: 'bg-green-100 text-green-800 border-green-300' },
      'waiting_authorization': { label: 'Waiting Auth', classes: 'bg-orange-100 text-orange-800 border-orange-300' },
      'in_repair': { label: 'In Repair', classes: 'bg-red-100 text-red-800 border-red-300' },
      'ack': { label: 'ACK', classes: 'bg-green-100 text-green-800 border-green-300' },
      'nak': { label: 'NAK', classes: 'bg-red-100 text-red-800 border-red-300' },
      'failed': { label: 'Failed', classes: 'bg-red-100 text-red-800 border-red-300' },
      'rejected': { label: 'Rejected', classes: 'bg-gray-100 text-gray-800 border-gray-300' },
      'completed': { label: 'Completed', classes: 'bg-green-100 text-green-800 border-green-300' }
    }

    const config = statusConfig[status] || { label: status, classes: 'bg-gray-100 text-gray-800 border-gray-300' }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border font-mono ${config.classes}`}>
        {config.label}
      </span>
    )
  }

  const handleAuthorize = async (messageId) => {
    try {
      await api.patch(`/messages/${messageId}/status`, { status: 'authorized' })
      setSuccessModal({ isOpen: true, message: 'Message authorized successfully!' })
      fetchMessages()
    } catch (error) {
      console.error('Error authorizing message:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Authorizing Message',
        message: error.response?.data?.message || 'Failed to authorize message',
        errors: error.response?.data?.errors || []
      })
    }
  }

  const handleReject = (messageId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reject Message',
      message: 'Are you sure you want to reject this message?',
      onConfirm: async () => {
        try {
          await api.patch(`/messages/${messageId}/status`, { status: 'rejected' })
          setSuccessModal({ isOpen: true, message: 'Message rejected successfully!' })
          fetchMessages()
        } catch (error) {
          console.error('Error rejecting message:', error)
          setErrorModal({
            isOpen: true,
            title: 'Error Rejecting Message',
            message: error.response?.data?.message || 'Failed to reject message',
            errors: error.response?.data?.errors || []
          })
        }
      }
    })
  }

  const handleDownloadFIN = async (messageId) => {
    try {
      const response = await api.get(`/messages/${messageId}/download-fin`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `FIN-${messageId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      setSuccessModal({ isOpen: true, message: 'FIN copy downloaded successfully!' })
    } catch (error) {
      console.error('Error downloading FIN copy:', error)
      if (error.response?.status === 403) {
        setErrorModal({
          isOpen: true,
          title: 'Download Not Available',
          message: 'FIN download is not enabled for your account. Please contact administrator to enable this feature.',
          errors: [],
          type: 'warning'
        })
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Error Downloading FIN Copy',
          message: error.response?.data?.message || 'Failed to download FIN copy',
          errors: error.response?.data?.errors || []
        })
      }
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Message Queue</h1>
            <p className="text-gray-600 font-mono">Actionable list of all transactions</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/user/message/new')}
          >
            <i className="bi bi-plus-circle"></i>
            Create Message
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-mono flex items-center gap-2">
                <i className="bi bi-funnel"></i>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="w-full"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="ready_to_send">Ready to Send</option>
                <option value="authorized">Authorized</option>
                <option value="waiting_authorization">Waiting Authorization</option>
                <option value="in_repair">In Repair</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-mono flex items-center gap-2">
                <i className="bi bi-tag"></i>
                Message Type
              </label>
              <select
                value={filters.messageType}
                onChange={(e) => setFilters({ ...filters, messageType: e.target.value, page: 1 })}
                className="w-full"
              >
                <option value="">All Types</option>
                <option value="MT103">MT103</option>
                <option value="MT700">MT700</option>
                <option value="MT202">MT202</option>
                <option value="MT940">MT940</option>
                <option value="pacs.008">pacs.008</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-mono flex items-center gap-2">
                <i className="bi bi-sort-down"></i>
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="w-full"
              >
                <option value="created_at">Date Created</option>
                <option value="value_date">Value Date</option>
                <option value="amount">Amount</option>
                <option value="status">Status</option>
                <option value="message_type">Message Type</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <i className="bi bi-inbox text-gray-300 text-5xl mb-4"></i>
              <p className="text-gray-500 font-mono">No messages found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      onClick={() => handleSort('status')} 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono cursor-pointer hover:bg-gray-100"
                    >
                      Status
                      {filters.sortBy === 'status' && (
                        <i className={`bi bi-chevron-${filters.sortOrder === 'ASC' ? 'up' : 'down'} ml-1`}></i>
                      )}
                    </th>
                    <th 
                      onClick={() => handleSort('message_type')} 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono cursor-pointer hover:bg-gray-100"
                    >
                      Message Type
                      {filters.sortBy === 'message_type' && (
                        <i className={`bi bi-chevron-${filters.sortOrder === 'ASC' ? 'up' : 'down'} ml-1`}></i>
                      )}
                    </th>
                    <th 
                      onClick={() => handleSort('reference')} 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono cursor-pointer hover:bg-gray-100"
                    >
                      Reference
                      {filters.sortBy === 'reference' && (
                        <i className={`bi bi-chevron-${filters.sortOrder === 'ASC' ? 'up' : 'down'} ml-1`}></i>
                      )}
                    </th>
                    <th 
                      onClick={() => handleSort('value_date')} 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono cursor-pointer hover:bg-gray-100"
                    >
                      Value Date / Time
                      {filters.sortBy === 'value_date' && (
                        <i className={`bi bi-chevron-${filters.sortOrder === 'ASC' ? 'up' : 'down'} ml-1`}></i>
                      )}
                    </th>
                    <th 
                      onClick={() => handleSort('amount')} 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono cursor-pointer hover:bg-gray-100"
                    >
                      Amount / Currency
                      {filters.sortBy === 'amount' && (
                        <i className={`bi bi-chevron-${filters.sortOrder === 'ASC' ? 'up' : 'down'} ml-1`}></i>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Sender / Receiver BIC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {messages.map(message => (
                    <tr key={message.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(message.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <strong className="font-mono">{message.message_type}</strong>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{message.reference || message.message_id}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="font-mono">{message.value_date ? new Date(message.value_date).toLocaleDateString() : 'N/A'}</div>
                        <div className="text-gray-500 text-xs font-mono">{new Date(message.created_at).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {message.amount && message.currency ? (
                          <strong className="font-mono">{message.currency} {parseFloat(message.amount).toLocaleString()}</strong>
                        ) : (
                          <span className="text-gray-400 font-mono">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="font-mono">
                          <div><strong>From:</strong> {message.sender_bic || 'N/A'}</div>
                          <div><strong>To:</strong> {message.receiver_bic || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            onClick={() => navigate(`/user/message/${message.id}`)}
                            title="View/Edit"
                          >
                            <i className="bi bi-eye text-lg"></i>
                          </button>
                          {message.status === 'pending' && (
                            <button
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              onClick={() => handleAuthorize(message.id)}
                              title="Authorize"
                            >
                              <i className="bi bi-check-circle text-lg"></i>
                            </button>
                          )}
                          {message.status === 'in_repair' && (
                            <button
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                              onClick={() => navigate(`/user/message/${message.id}`)}
                              title="Repair"
                            >
                              <i className="bi bi-tools text-lg"></i>
                            </button>
                          )}
                          {(message.status === 'sent' || message.status === 'completed' || message.status === 'ack') && (
                            <button
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                              onClick={() => handleDownloadFIN(message.id)}
                              title="Download FIN Copy"
                            >
                              <i className="bi bi-file-earmark-pdf text-lg"></i>
                            </button>
                          )}
                          {message.status === 'pending' && (
                            <button
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              onClick={() => handleReject(message.id)}
                              title="Reject"
                            >
                              <i className="bi bi-x-circle text-lg"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <button
              className="btn btn-secondary"
              disabled={pagination.page === 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              <i className="bi bi-chevron-left"></i>
              Previous
            </button>
            <span className="text-gray-700 font-mono">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              className="btn btn-secondary"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              Next
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '', errors: [] })}
        title={errorModal.title}
        message={errorModal.message}
        errors={errorModal.errors}
        type={errorModal.type || 'error'}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
      />
    </>
  )
}

export default MessageQueue
