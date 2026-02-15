import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'

const MessageReplies = () => {
  const [replies, setReplies] = useState([])
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
    if (permissions.can_view_replies) {
      fetchReplies()
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

  const fetchReplies = async () => {
    try {
      setLoading(true)
      const params = selectedMessage ? `?messageId=${selectedMessage}` : ''
      const response = await api.get(`/message-replies/my-replies${params}`)
      setReplies(response.data.replies || [])
    } catch (error) {
      console.error('Error fetching replies:', error)
      if (error.response?.status === 403) {
        setErrorModal({
          isOpen: true,
          title: 'Permission Required',
          message: error.response.data.message || 'You do not have permission to view replies. Please contact your administrator.'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'received': { label: 'Received', classes: 'bg-blue-100 text-blue-800 border-blue-300' },
      'processed': { label: 'Processed', classes: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      'acknowledged': { label: 'Acknowledged', classes: 'bg-green-100 text-green-800 border-green-300' }
    }
    const config = statusConfig[status] || { label: status, classes: 'bg-gray-100 text-gray-800 border-gray-300' }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${config.classes}`}>
        {config.label}
      </span>
    )
  }

  if (!permissions.can_view_replies) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">
              <i className="bi bi-lock-fill"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
            <p className="text-gray-600 mb-6">
              You do not have permission to view message replies. Please contact your administrator to request access.
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Message Replies</h1>
          <p className="text-gray-600">View replies from receiving banks for your sent messages</p>
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
            <div className="flex items-end">
              <button
                onClick={() => navigate('/swift-copies')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <i className="bi bi-file-earmark-pdf mr-2"></i>
                View SWIFT Copies
              </button>
            </div>
          </div>
        </div>

        {/* Replies List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Replies ({replies.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading replies...</p>
            </div>
          ) : replies.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">
                <i className="bi bi-inbox"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Replies Found</h3>
              <p className="text-gray-600">
                {selectedMessage ? 'No replies found for the selected message.' : 'No replies found for your messages.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {replies.map(reply => (
                <div key={reply.id} className="p-6 hover:bg-gray-50">
                  {/* Banking Communication Header */}
                  <div className="border-2 border-gray-300 rounded-lg mb-4">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-mono text-gray-600">
                          SWIFT FIN MESSAGE REPLY
                        </div>
                        <div className="text-sm font-mono text-gray-600">
                          {formatDate(reply.created_at)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Message Header Block */}
                    <div className="px-4 py-3 border-b border-gray-200 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-gray-600">:20:</span>
                          <span className="text-gray-900 font-bold">REFERENCE</span>
                          <span className="text-gray-900 ml-4">{reply.utr}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">:27:</span>
                          <span className="text-gray-900 font-bold">MESSAGE TYPE</span>
                          <span className="text-gray-900 ml-4">{reply.message_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">:50A:</span>
                          <span className="text-gray-900 font-bold">ORDERING CUSTOMER</span>
                          <span className="text-gray-900 ml-4">{reply.sender_bic}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">:52A:</span>
                          <span className="text-gray-900 font-bold">ORDERING INSTITUTION</span>
                          <span className="text-gray-900 ml-4">{reply.sender_bic}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">:57A:</span>
                          <span className="text-gray-900 font-bold">ACCOUNT WITH INSTITUTION</span>
                          <span className="text-gray-900 ml-4">{reply.receiver_bic}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">:59:</span>
                          <span className="text-gray-900 font-bold">BENEFICIARY CUSTOMER</span>
                          <span className="text-gray-900 ml-4">{reply.receiver_bic}</span>
                        </div>
                        {reply.amount && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">:32A:</span>
                              <span className="text-gray-900 font-bold">CURRENCY</span>
                              <span className="text-gray-900 ml-4">{reply.currency}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">:33B:</span>
                              <span className="text-gray-900 font-bold">AMOUNT</span>
                              <span className="text-gray-900 ml-4">{reply.amount}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">:71A:</span>
                          <span className="text-gray-900 font-bold">DETAILS OF CHARGES</span>
                          <span className="text-gray-900 ml-4">SHA</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Message Content */}
                    <div className="px-4 py-3 bg-white">
                      <div className="mb-3">
                        <div className="text-xs font-mono text-gray-600 mb-2">:79:</div>
                        <div className="bg-gray-50 border border-gray-200 rounded p-3 font-mono text-xs text-gray-800 whitespace-pre-wrap">
                          {reply.content || 'No content available'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Message Footer */}
                    <div className="bg-gray-100 px-4 py-2 border-t border-gray-300">
                      <div className="flex justify-between items-center text-xs font-mono text-gray-600">
                        <div>MAC: {Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
                        <div>CHK: {Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
                        <div>{getStatusBadge(reply.status)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Attachment if exists */}
                  {reply.file_path && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Attachment:</h4>
                      <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <i className="bi bi-file-earmark text-blue-600"></i>
                        <span className="text-sm text-blue-900 font-medium">{reply.original_filename}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => navigate(`/messages/${reply.message_id}/raw-fin`)}
                      className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                    >
                      <i className="bi bi-code-slash mr-1"></i>
                      View Raw SWIFT
                    </button>
                    <button
                      onClick={() => navigate(`/swift-copies?messageId=${reply.message_id}`)}
                      className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center"
                    >
                      <i className="bi bi-file-earmark-pdf mr-1"></i>
                      SWIFT Copies
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

export default MessageReplies
