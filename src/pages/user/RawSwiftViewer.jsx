import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'

const RawSwiftViewer = () => {
  const { messageId } = useParams()
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' })
  const [copied, setCopied] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    fetchMessage()
  }, [messageId])

  const fetchMessage = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/message-replies/raw-fin/${messageId}`)
      setMessage(response.data.message)
    } catch (error) {
      console.error('Error fetching message:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to load message'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const downloadAsFile = () => {
    const element = document.createElement('a')
    const file = new Blob([message.content], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `SWIFT-${message.utr}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      'sent': { label: 'Sent', classes: 'bg-blue-100 text-blue-800 border-blue-300' },
      'ack': { label: 'ACK', classes: 'bg-green-100 text-green-800 border-green-300' },
      'nak': { label: 'NAK', classes: 'bg-red-100 text-red-800 border-red-300' },
      'completed': { label: 'Completed', classes: 'bg-green-100 text-green-800 border-green-300' }
    }
    const config = statusConfig[status] || { label: status, classes: 'bg-gray-100 text-gray-800 border-gray-300' }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${config.classes}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading SWIFT message...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!message) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">
              <i className="bi bi-file-earmark-x"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Message Not Found</h2>
            <p className="text-gray-600 mb-6">The requested SWIFT message could not be found.</p>
            <button
              onClick={() => navigate('/message-history')}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Back to Messages
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-emerald-600 hover:text-emerald-700 flex items-center"
          >
            <i className="bi bi-arrow-left mr-2"></i>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Raw SWIFT Message</h1>
          <p className="text-gray-600">View the complete SWIFT FIN message content</p>
        </div>

        {/* Message Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UTR</label>
              <p className="text-sm font-mono text-gray-900">{message.utr}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message Type</label>
              <p className="text-sm font-mono text-gray-900">{message.messageType}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div>{getStatusBadge(message.status)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
              <p className="text-sm text-gray-900">{formatDate(message.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender BIC</label>
              <p className="text-sm font-mono text-gray-900">{message.senderBIC}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receiver BIC</label>
              <p className="text-sm font-mono text-gray-900">{message.receiverBIC}</p>
            </div>
          </div>

          {message.amount && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <p className="text-lg font-semibold text-gray-900">
                {message.amount} {message.currency}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <i className={`bi ${copied ? 'bi-check' : 'bi-clipboard'} mr-2`}></i>
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button
              onClick={downloadAsFile}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <i className="bi bi-download mr-2"></i>
              Download as TXT
            </button>
            <button
              onClick={() => navigate(`/message-replies?messageId=${messageId}`)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
            >
              <i className="bi bi-reply mr-2"></i>
              View Replies
            </button>
            <button
              onClick={() => navigate(`/swift-copies?messageId=${messageId}`)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <i className="bi bi-file-earmark-pdf mr-2"></i>
              SWIFT Copies
            </button>
          </div>
        </div>

        {/* SWIFT Content */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">SWIFT FIN Content</h2>
            <p className="text-sm text-gray-600 mt-1">
              Complete SWIFT message in FIN format
            </p>
          </div>
          
          <div className="p-6">
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all">{message.content}</pre>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                <i className="bi bi-info-circle mr-1"></i>
                This is the raw SWIFT FIN message format used by the SWIFT network
              </p>
              <button
                onClick={copyToClipboard}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                <i className="bi bi-clipboard mr-1"></i>
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
      />
    </div>
  )
}

export default RawSwiftViewer
