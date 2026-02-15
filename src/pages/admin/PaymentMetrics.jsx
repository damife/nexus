import React, { useState, useEffect } from 'react'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import Pagination from '../../components/Pagination'

const PaymentMetrics = () => {
  const [metrics, setMetrics] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    totalAmount: 0,
    averageAmount: 0,
    byCurrency: {},
    byType: {},
    hourlyStats: []
  })
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchMetrics()
    fetchTransactions()
    const interval = setInterval(() => {
      fetchMetrics()
      fetchTransactions()
    }, 10000)

    return () => clearInterval(interval)
  }, [currentPage])

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/admin/payment-metrics')
      if (response.data) {
        setMetrics(response.data)
      }
    } catch (error) {
      console.error('Error fetching payment metrics:', error)
      if (loading) {
        setErrorModal({
          isOpen: true,
          title: 'Error Loading Metrics',
          message: error.response?.data?.message || 'Failed to load payment metrics',
          errors: error.response?.data?.errors || []
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await api.get(`/admin/payment-transactions?page=${currentPage}&limit=${itemsPerPage}`)
      if (response.data) {
        setTransactions(response.data.transactions || [])
        setTotalPages(response.data.totalPages || 1)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-mono">Payment Metrics Dashboard</h1>
          <p className="text-gray-600 font-mono mt-1">Real-time payment processing statistics and analytics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 font-mono">Total Payments</h3>
              <i className="bi bi-currency-dollar text-blue-600 text-xl"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.total.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">All time</p>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 font-mono">Successful</h3>
              <i className="bi bi-check-circle-fill text-green-600 text-xl"></i>
            </div>
            <p className="text-3xl font-bold text-green-600">{metrics.successful.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">
              {metrics.total > 0 ? ((metrics.successful / metrics.total) * 100).toFixed(1) : 0}% success rate
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 font-mono">Failed</h3>
              <i className="bi bi-x-circle-fill text-red-600 text-xl"></i>
            </div>
            <p className="text-3xl font-bold text-red-600">{metrics.failed.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">
              {metrics.total > 0 ? ((metrics.failed / metrics.total) * 100).toFixed(1) : 0}% failure rate
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 font-mono">Total Amount</h3>
              <i className="bi bi-graph-up text-purple-600 text-xl"></i>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }).format(metrics.totalAmount)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Processed</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Payment ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{tx.payment_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tx.currency} {parseFloat(tx.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            tx.status === 'sent' || tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                            tx.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={metrics.total}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
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

export default PaymentMetrics

