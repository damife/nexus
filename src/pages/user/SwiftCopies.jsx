import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'

const SwiftCopies = () => {
  const [copies, setCopies] = useState([])
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState({
    can_view_replies: false,
    can_download_swift_copies: false
  })
  const [selectedMessage, setSelectedMessage] = useState('')
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  const [messages, setMessages] = useState([])

  const navigate = useNavigate()

  useEffect(() => {
    checkPermissions()
    fetchUserMessages()
  }, [])

  useEffect(() => {
    if (permissions.can_download_swift_copies) {
      fetchCopies()
    }
  }, [permissions, selectedMessage])

  const checkPermissions = async () => {
    try {
      const response = await api.get('/message-replies/permissions')
      setPermissions(response.data.permissions)
    } catch (error) {
      console.error('Error checking permissions:', error)
    }
  }

  const fetchUserMessages = async () => {
    try {
      const response = await api.get('/messages/history')
      setMessages(response.data.messages || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchCopies = async () => {
    try {
      setLoading(true)
      const params = selectedMessage ? `?messageId=${selectedMessage}` : ''
      const response = await api.get(`/message-replies/swift-copies/my-availability${params}`)
      setCopies(response.data.copies || [])
    } catch (error) {
      console.error('Error fetching SWIFT copies:', error)
      if (error.response?.status === 403) {
        setErrorModal({
          isOpen: true,
          title: 'Permission Required',
          message: error.response.data.message || 'You do not have permission to download SWIFT copies. Please contact your administrator.'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const downloadCopy = async (copyId) => {
    try {
      const response = await api.get(`/message-replies/swift-copies/download/${copyId}`, {
        responseType: 'blob'
      })
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition']
      let filename = 'swift-copy.pdf'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setSuccessModal({
        isOpen: true,
        message: 'SWIFT copy downloaded successfully!'
      })
    } catch (error) {
      console.error('Error downloading SWIFT copy:', error)
      setErrorModal({
        isOpen: true,
        title: 'Download Error',
        message: 'Failed to download SWIFT copy. Please try again later.'
      })
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getCopyTypeBadge = (copyType) => {
    const typeConfig = {
      'original': { label: 'Original', classes: 'bg-blue-100 text-blue-800 border-blue-300' },
      'acknowledgment': { label: 'Acknowledgment', classes: 'bg-green-100 text-green-800 border-green-300' },
      'confirmation': { label: 'Confirmation', classes: 'bg-purple-100 text-purple-800 border-purple-300' }
    }
    const config = typeConfig[copyType] || { label: copyType, classes: 'bg-gray-100 text-gray-800 border-gray-300' }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${config.classes}`}>
        {config.label}
      </span>
    )
  }

  if (!permissions.can_download_swift_copies) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">
              <i className="bi bi-file-earmark-lock"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
            <p className="text-gray-600 mb-6">
              You do not have permission to download SWIFT copies. Please contact your administrator to request access.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SWIFT Copies</h1>
          <p className="text-gray-600">Download official SWIFT message copies and confirmations</p>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Message
              </label>
              <select
                value={selectedMessage}
                onChange={(e) => setSelectedMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Messages</option>
                {messages.map(message => (
                  <option key={message.id} value={message.id}>
                    {message.utr} - {message.message_type} - {new Date(message.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={() => navigate('/message-replies')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <i className="bi bi-reply mr-2"></i>
                View Replies
              </button>
              <button
                onClick={fetchCopies}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <i className="bi bi-arrow-clockwise mr-2"></i>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* SWIFT Copies List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Available SWIFT Copies ({copies.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading SWIFT copies...</p>
            </div>
          ) : copies.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">
                <i className="bi bi-file-earmark-pdf"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No SWIFT Copies Available</h3>
              <p className="text-gray-600">
                {selectedMessage 
                  ? 'No SWIFT copies available for the selected message yet.' 
                  : 'No SWIFT copies available for your messages yet. Your administrator will upload them when available.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {copies.map(copy => (
                <div key={copy.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        SWIFT Copy for: {copy.utr}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {copy.message_type} • {copy.sender_bic} → {copy.receiver_bic}
                      </p>
                      <p className="text-sm text-gray-500">
                        Amount: {copy.amount} {copy.currency} • 
                        Message Date: {formatDate(copy.message_date)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {getCopyTypeBadge(copy.copy_type)}
                      <span className="text-sm text-gray-500">
                        {formatFileSize(copy.file_size)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <i className="bi bi-file-earmark-pdf text-red-600 text-xl"></i>
                        <span className="text-sm font-medium text-gray-900">
                          {copy.original_filename}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Uploaded: {formatDate(copy.uploaded_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => downloadCopy(copy.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                    >
                      <i className="bi bi-download mr-2"></i>
                      Download PDF
                    </button>
                    <button
                      onClick={() => navigate(`/messages/${copy.message_id}/raw-fin`)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <i className="bi bi-code-slash mr-1"></i>
                      View Raw SWIFT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
      />
    </div>
  )
}

export default SwiftCopies
