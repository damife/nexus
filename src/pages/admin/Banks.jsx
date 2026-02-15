import React, { useState, useEffect } from 'react'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'

const Banks = () => {
  const [banks, setBanks] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  const [formData, setFormData] = useState({
    name: '',
    bic: '',
    address: '',
    country: '',
    customerNumber: '',
    registrationNumber: ''
  })

  useEffect(() => {
    fetchBanks()
  }, [])

  const fetchBanks = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/banks')
      setBanks(response.data.banks || [])
    } catch (err) {
      console.error('Error fetching banks:', err)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Banks',
        message: err.response?.data?.message || 'Failed to load banks',
        errors: err.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorModal({ isOpen: false, title: '', message: '', errors: [] })

    try {
      const response = await api.post('/admin/banks', formData)
      if (response.data.success) {
        setSuccessModal({ isOpen: true, message: 'Bank added successfully!' })
        setShowModal(false)
        setFormData({ name: '', bic: '', address: '', country: '', customerNumber: '', registrationNumber: '' })
        fetchBanks()
      } else {
        throw new Error(response.data.message || 'Failed to add bank')
      }
    } catch (err) {
      console.error('Error adding bank:', err)
      setErrorModal({
        isOpen: true,
        title: 'Error Adding Bank',
        message: err.response?.data?.message || 'Failed to add bank',
        errors: err.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Bank Management</h1>
            <p className="text-gray-600 font-mono">Manage financial institutions and their details</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <i className="bi bi-plus-circle"></i>
            Add Bank
          </button>
        </div>

        {loading && banks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banks.map(bank => (
              <div key={bank.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-building text-blue-600 text-xl"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 font-mono truncate">{bank.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{bank.bic}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <i className="bi bi-geo-alt text-gray-400"></i>
                    <span className="font-mono truncate">{bank.address}, {bank.country}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <i className="bi bi-hash text-gray-400"></i>
                    <span className="font-mono">Customer: {bank.customerNumber || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <i className="bi bi-card-text text-gray-400"></i>
                    <span className="font-mono">Reg: {bank.registrationNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
            {banks.length === 0 && (
              <div className="col-span-full text-center py-12">
                <i className="bi bi-building text-gray-300 text-5xl mb-4"></i>
                <p className="text-gray-500 font-mono">No banks found. Add your first bank to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 font-mono">Add New Bank</h2>
              <button 
                className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-all"
                onClick={() => setShowModal(false)}
              >
                <i className="bi bi-x text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Institution Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">BIC Code *</label>
                <input
                  type="text"
                  value={formData.bic}
                  onChange={(e) => setFormData({ ...formData, bic: e.target.value.toUpperCase() })}
                  required
                  maxLength={11}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Country *</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Customer Number</label>
                <input
                  type="text"
                  value={formData.customerNumber}
                  onChange={(e) => setFormData({ ...formData, customerNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Registration Number</label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  disabled={loading}
                />
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check"></i>
                      Add Bank
                    </>
                  )}
                </button>
              </div>
            </form>
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

export default Banks
