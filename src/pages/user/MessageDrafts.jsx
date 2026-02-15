import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'

const MessageDrafts = () => {
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  const [selectedDraft, setSelectedDraft] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/messages/drafts')
      setDrafts(response.data.drafts || [])
    } catch (error) {
      console.error('Error fetching drafts:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Drafts',
        message: error.response?.data?.message || 'Failed to load message drafts',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditDraft = (draft) => {
    // Navigate to message editor with draft data
    navigate('/user/message/new', { 
      state: { 
        draftData: draft,
        isEditingDraft: true 
      } 
    })
  }

  const handleDeleteDraft = async () => {
    if (!selectedDraft) return

    try {
      setLoading(true)
      await api.delete(`/messages/drafts/${selectedDraft.id}`)
      
      setSuccessModal({
        isOpen: true,
        message: 'Draft deleted successfully!'
      })
      
      setShowDeleteModal(false)
      setSelectedDraft(null)
      fetchDrafts()
    } catch (error) {
      console.error('Error deleting draft:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Deleting Draft',
        message: error.response?.data?.message || 'Failed to delete draft',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMessageTypeIcon = (messageType) => {
    switch (messageType) {
      case 'MT103': return 'bi-cash-stack'
      case 'MT202': return 'bi-bank'
      case 'MT940': return 'bi-file-text'
      default: return 'bi-envelope'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'system': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading && drafts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Message Drafts</h1>
            <p className="text-gray-600 font-mono">View and manage your saved message drafts</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/user/message/new')}
          >
            <i className="bi bi-plus-circle mr-2"></i>
            Create New Message
          </button>
        </div>

        {drafts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 border border-gray-200 text-center">
            <i className="bi bi-file-earmark-text text-gray-300 text-6xl mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-2">No Drafts Found</h3>
            <p className="text-gray-600 font-mono mb-6">You haven't saved any message drafts yet.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/user/message/new')}
            >
              <i className="bi bi-plus-circle mr-2"></i>
              Create Your First Message
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Receiver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Last Modified</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drafts.map((draft) => (
                    <tr key={draft.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <i className={`bi ${getMessageTypeIcon(draft.message_type)} text-blue-600`}></i>
                          <span className="text-sm font-medium text-gray-900 font-mono">{draft.message_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {draft.receiver_bic || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {draft.amount ? `${draft.currency} ${parseFloat(draft.amount).toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-mono ${getPriorityColor(draft.priority)}`}>
                          {draft.priority || 'normal'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {formatDate(draft.updated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            onClick={() => handleEditDraft(draft)}
                            title="Edit Draft"
                          >
                            <i className="bi bi-pencil text-lg"></i>
                          </button>
                          <button
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            onClick={() => handleEditDraft(draft)}
                            title="Send Message"
                          >
                            <i className="bi bi-send text-lg"></i>
                          </button>
                          <button
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            onClick={() => {
                              setSelectedDraft(draft)
                              setShowDeleteModal(true)
                            }}
                            title="Delete Draft"
                          >
                            <i className="bi bi-trash text-lg"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-[90%] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 font-mono">Delete Draft</h2>
              <button 
                className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-all"
                onClick={() => setShowDeleteModal(false)}
              >
                <i className="bi bi-x text-xl"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="bi bi-exclamation-triangle text-red-600 text-xl"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 font-mono">Are you sure?</h3>
                  <p className="text-sm text-gray-600 font-mono">
                    This will permanently delete the draft for {selectedDraft.message_type} message to {selectedDraft.receiver_bic}.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={handleDeleteDraft}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash mr-2"></i>
                      Delete Draft
                    </>
                  )}
                </button>
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

export default MessageDrafts
