import React, { useState, useEffect } from 'react'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'

const MessageManagement = () => {
  const [activeTab, setActiveTab] = useState('permissions')
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  
  // Form states
  const [selectedMessage, setSelectedMessage] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [replyType, setReplyType] = useState('text')
  const [replyStatus, setReplyStatus] = useState('received')
  const [replyFile, setReplyFile] = useState(null)
  
  const [swiftCopyFile, setSwiftCopyFile] = useState(null)
  const [swiftCopyType, setSwiftCopyType] = useState('original')
  
  const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' })
  const [statusTrail, setStatusTrail] = useState([])

  useEffect(() => {
    if (activeTab === 'permissions') {
      fetchUsers()
    } else if (activeTab === 'replies' || activeTab === 'copies') {
      fetchMessages()
    }
  }, [activeTab])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/message-replies/admin/users')
      setUsers(response.data.users)
    } catch (error) {
      console.error('Error fetching users:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to fetch users'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await api.get('/messages/queue?limit=100')
      setMessages(response.data.messages || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to fetch messages'
      })
    } finally {
      setLoading(false)
    }
  }

  const updateUserPermissions = async (userId, permissions) => {
    try {
      await api.put(`/message-replies/admin/users/${userId}/permissions`, permissions)
      setSuccessModal({
        isOpen: true,
        message: 'User permissions updated successfully!'
      })
      fetchUsers()
    } catch (error) {
      console.error('Error updating permissions:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to update user permissions'
      })
    }
  }

  const uploadReply = async () => {
    try {
      const formData = new FormData()
      formData.append('messageId', selectedMessage)
      formData.append('replyType', replyType)
      formData.append('content', replyContent)
      formData.append('status', replyStatus)
      if (replyFile) {
        formData.append('replyFile', replyFile)
      }

      const response = await api.post('/message-replies/admin/replies', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setSuccessModal({
        isOpen: true,
        message: 'Reply uploaded successfully!'
      })
      
      // Reset form
      setReplyContent('')
      setReplyFile(null)
      setSelectedMessage('')
      
    } catch (error) {
      console.error('Error uploading reply:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to upload reply'
      })
    }
  }

  const uploadSwiftCopy = async () => {
    try {
      const formData = new FormData()
      formData.append('messageId', selectedMessage)
      formData.append('copyType', swiftCopyType)
      formData.append('swiftCopy', swiftCopyFile)

      const response = await api.post('/message-replies/admin/swift-copies', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setSuccessModal({
        isOpen: true,
        message: 'SWIFT copy uploaded successfully!'
      })
      
      // Reset form
      setSwiftCopyFile(null)
      setSelectedMessage('')
      
    } catch (error) {
      console.error('Error uploading SWIFT copy:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to upload SWIFT copy'
      })
    }
  }

  const updateMessageStatus = async () => {
    try {
      await api.put(`/message-replies/admin/messages/${selectedMessage}/status`, statusUpdate)
      setSuccessModal({
        isOpen: true,
        message: 'Message status updated successfully!'
      })
      
      // Reset form and refresh trail
      setStatusUpdate({ status: '', notes: '' })
      if (selectedMessage) {
        fetchStatusTrail(selectedMessage)
      }
      
    } catch (error) {
      console.error('Error updating status:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to update message status'
      })
    }
  }

  const fetchStatusTrail = async (messageId) => {
    try {
      const response = await api.get(`/message-replies/admin/messages/${messageId}/status-trail`)
      setStatusTrail(response.data.trail || [])
    } catch (error) {
      console.error('Error fetching status trail:', error)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Message Management</h1>
          <p className="text-gray-600">Manage user permissions, replies, SWIFT copies, and message status</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('permissions')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'permissions'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="bi bi-shield-check mr-2"></i>
                User Permissions
              </button>
              <button
                onClick={() => setActiveTab('replies')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'replies'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="bi bi-reply mr-2"></i>
                Upload Replies
              </button>
              <button
                onClick={() => setActiveTab('copies')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'copies'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="bi bi-file-earmark-pdf mr-2"></i>
                SWIFT Copies
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'status'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="bi bi-arrow-repeat mr-2"></i>
                Status Updates
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'permissions' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Permissions</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Can View Replies
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Can Download SWIFT Copies
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.bank_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'operator' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={user.can_view_replies}
                          onChange={(e) => updateUserPermissions(user.id, {
                            can_view_replies: e.target.checked,
                            can_download_swift_copies: user.can_download_swift_copies
                          })}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={user.can_download_swift_copies}
                          onChange={(e) => updateUserPermissions(user.id, {
                            can_view_replies: user.can_view_replies,
                            can_download_swift_copies: e.target.checked
                          })}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => updateUserPermissions(user.id, {
                            can_view_replies: true,
                            can_download_swift_copies: true
                          })}
                          className="text-emerald-600 hover:text-emerald-900 mr-3"
                        >
                          Grant All
                        </button>
                        <button
                          onClick={() => updateUserPermissions(user.id, {
                            can_view_replies: false,
                            can_download_swift_copies: false
                          })}
                          className="text-red-600 hover:text-red-900"
                        >
                          Revoke All
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'replies' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Message Reply</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Message
                </label>
                <select
                  value={selectedMessage}
                  onChange={(e) => setSelectedMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Choose a message...</option>
                  {messages.map(message => (
                    <option key={message.id} value={message.id}>
                      {message.utr} - {message.message_type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reply Type
                </label>
                <select
                  value={replyType}
                  onChange={(e) => setReplyType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="text">Text Reply</option>
                  <option value="file">File Attachment</option>
                  <option value="swift_reply">SWIFT Reply</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="received">Received</option>
                  <option value="processed">Processed</option>
                  <option value="acknowledged">Acknowledged</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachment (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setReplyFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  accept=".pdf,.doc,.docx,.txt"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reply Content
              </label>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter reply content..."
              />
            </div>

            <div className="mt-6">
              <button
                onClick={uploadReply}
                disabled={!selectedMessage || (!replyContent && !replyFile)}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <i className="bi bi-upload mr-2"></i>
                Upload Reply
              </button>
            </div>
          </div>
        )}

        {activeTab === 'copies' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload SWIFT Copy</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Message
                </label>
                <select
                  value={selectedMessage}
                  onChange={(e) => setSelectedMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Choose a message...</option>
                  {messages.map(message => (
                    <option key={message.id} value={message.id}>
                      {message.utr} - {message.message_type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Copy Type
                </label>
                <select
                  value={swiftCopyType}
                  onChange={(e) => setSwiftCopyType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="original">Original SWIFT Copy</option>
                  <option value="acknowledgment">Acknowledgment</option>
                  <option value="confirmation">Confirmation</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SWIFT Copy File (PDF)
              </label>
              <input
                type="file"
                onChange={(e) => setSwiftCopyFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                accept=".pdf"
              />
            </div>

            <div className="mt-6">
              <button
                onClick={uploadSwiftCopy}
                disabled={!selectedMessage || !swiftCopyFile}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <i className="bi bi-file-earmark-pdf mr-2"></i>
                Upload SWIFT Copy
              </button>
            </div>
          </div>
        )}

        {activeTab === 'status' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Update Message Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Message
                </label>
                <select
                  value={selectedMessage}
                  onChange={(e) => {
                    setSelectedMessage(e.target.value)
                    if (e.target.value) {
                      fetchStatusTrail(e.target.value)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Choose a message...</option>
                  {messages.map(message => (
                    <option key={message.id} value={message.id}>
                      {message.utr} - {message.message_type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({...statusUpdate, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select status...</option>
                  <option value="pending">Pending</option>
                  <option value="ready_to_send">Ready to Send</option>
                  <option value="authorized">Authorized</option>
                  <option value="sent">Sent</option>
                  <option value="ack">ACK Received</option>
                  <option value="nak">NAK Received</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={statusUpdate.notes}
                onChange={(e) => setStatusUpdate({...statusUpdate, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Add notes about this status change..."
              />
            </div>

            <div className="mb-6">
              <button
                onClick={updateMessageStatus}
                disabled={!selectedMessage || !statusUpdate.status}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <i className="bi bi-arrow-repeat mr-2"></i>
                Update Status
              </button>
            </div>

            {/* Status Trail */}
            {selectedMessage && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Trail</h3>
                {statusTrail.length === 0 ? (
                  <p className="text-gray-500">No status changes recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {statusTrail.map((trail, index) => (
                      <div key={trail.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <i className="bi bi-clock-history text-blue-600 text-sm"></i>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              Status changed to: <span className="font-semibold">{trail.status}</span>
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(trail.created_at)}</p>
                          </div>
                          <p className="text-sm text-gray-600">
                            By: {trail.username} ({trail.role})
                          </p>
                          {trail.notes && (
                            <p className="text-sm text-gray-700 mt-1">
                              Notes: {trail.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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

export default MessageManagement
