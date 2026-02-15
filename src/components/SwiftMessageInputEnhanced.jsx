import React, { useState, useEffect } from 'react'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'
import { Card, Button, Input, Badge } from '../../components/UIComponents'

const SwiftMessageInputEnhanced = ({ onMessageSent, initialData = {} }) => {
  const [loading, setLoading] = useState(false)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  
  const [messageData, setMessageData] = useState({
    messageType: initialData.messageType || 'MT103',
    senderBIC: initialData.senderBIC || '',
    receiverBIC: initialData.receiverBIC || '',
    correspondentBank: initialData.correspondentBank || '',
    amount: initialData.amount || '',
    currency: initialData.currency || 'USD',
    priority: initialData.priority || 'normal',
    textBlock: initialData.textBlock || {}
  })

  const [correspondentBanks, setCorrespondentBanks] = useState([])
  const [routingOptions, setRoutingOptions] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [estimatedDelivery, setEstimatedDelivery] = useState('')

  // SWIFT field definitions
  const swiftFieldDefinitions = {
    'MT103': {
      name: 'Customer Credit Transfer',
      fields: [
        { tag: '20', label: 'Transaction Reference Number', required: true, example: 'REF123456' },
        { tag: '23B', label: 'Bank Operation Code', required: true, options: ['CRED', 'SPAY', 'SPRI', 'SSTD'], example: 'CRED' },
        { tag: '32A', label: 'Value Date/Currency/Interbank Settled Amount', required: true, example: '241231USD10000,' },
        { tag: '50K', label: 'Ordering Customer', required: true, type: 'textarea', example: '/1234567890\nJOHN DOE' },
        { tag: '59', label: 'Beneficiary Customer', required: true, type: 'textarea', example: '/9876543210\nJANE SMITH' },
        { tag: '70', label: 'Remittance Information', type: 'textarea', example: 'Invoice payment' },
        { tag: '71A', label: 'Details of Charges', options: ['OUR', 'SHA', 'BEN'], example: 'SHA' },
        { tag: '72', label: 'Sender to Receiver Information', type: 'textarea', example: '/ACC/Account information' }
      ]
    },
    'MT202': {
      name: 'General Financial Institution Transfer',
      fields: [
        { tag: '20', label: 'Transaction Reference Number', required: true, example: 'REF789012' },
        { tag: '21', label: 'Related Reference', example: 'REF123456' },
        { tag: '32A', label: 'Value Date/Currency/Interbank Settled Amount', required: true, example: '241231USD50000,' },
        { tag: '56A', label: 'Intermediary Institution', example: 'BANKUS33XXX' },
        { tag: '57A', label: 'Account With Institution', example: 'BANKEU33XXX' },
        { tag: '58A', label: 'Beneficiary Institution', required: true, example: 'BANKUK33XXX' }
      ]
    },
    'MT940': {
      name: 'Customer Statement Message',
      fields: [
        { tag: '20', label: 'Transaction Reference Number', required: true, example: 'STATEMENT001' },
        { tag: '25', label: 'Account Identification', required: true, example: '1234567890' },
        { tag: '28C', label: 'Statement Number', required: true, example: '1/1' },
        { tag: '60F', label: 'Opening Balance', required: true, example: 'C241201USD10000,' },
        { tag: '61', label: 'Statement Line', required: true, example: '241202C12345,00NMSCNONREF' },
        { tag: '62F', label: 'Closing Balance', required: true, example: 'C241201USD15000,' }
      ]
    }
  }

  useEffect(() => {
    fetchCorrespondentBanks()
    if (messageData.receiverBIC) {
      fetchRoutingOptions()
    }
  }, [])

  useEffect(() => {
    if (messageData.receiverBIC) {
      fetchRoutingOptions()
    }
  }, [messageData.receiverBIC, messageData.amount, messageData.priority])

  const fetchCorrespondentBanks = async () => {
    try {
      const response = await api.get('/user/correspondent-banks')
      setCorrespondentBanks(response.data.banks || [])
    } catch (error) {
      console.error('Error fetching correspondent banks:', error)
    }
  }

  const fetchRoutingOptions = async () => {
    try {
      if (!messageData.receiverBIC) return

      const response = await api.post('/user/routing-options', {
        messageType: messageData.messageType,
        receiverBIC: messageData.receiverBIC,
        amount: messageData.amount,
        priority: messageData.priority,
        correspondentBank: messageData.correspondentBank
      })

      setRoutingOptions(response.data.routes || [])
      
      // Auto-select best route
      if (response.data.routes && response.data.routes.length > 0) {
        const bestRoute = response.data.routes[0] // Routes are pre-sorted by score
        setSelectedRoute(bestRoute)
        setEstimatedCost(bestRoute.estimatedCost)
        setEstimatedDelivery(bestRoute.estimatedDelivery)
      }
    } catch (error) {
      console.error('Error fetching routing options:', error)
    }
  }

  const handleInputChange = (field, value) => {
    setMessageData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFieldChange = (tag, value) => {
    setMessageData(prev => ({
      ...prev,
      textBlock: {
        ...prev.textBlock,
        [tag]: value
      }
    }))
  }

  const generateSwiftMessage = () => {
    const fields = swiftFieldDefinitions[messageData.messageType]?.fields || []
    let message = ''

    // Build Block 1-5
    message += `{1:F01${messageData.senderBIC}0000000000}\n`
    message += `{2:I${messageData.messageType}N}${messageData.receiverBIC}\n`
    message += `{3:{108:TEST}}\n`
    message += `{4:\n`

    // Add fields
    fields.forEach(field => {
      const value = messageData.textBlock[field.tag] || ''
      if (value || field.required) {
        message += `:${field.tag}:${value}\n`
      }
    })

    message += `-}\n`

    return message
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)

      // Validate required fields
      const fields = swiftFieldDefinitions[messageData.messageType]?.fields || []
      const missingFields = fields.filter(field => 
        field.required && !messageData.textBlock[field.tag]
      )

      if (missingFields.length > 0) {
        setErrorModal({
          isOpen: true,
          title: 'Validation Error',
          message: 'Please fill in all required fields',
          errors: missingFields.map(f => `${f.label} is required`)
        })
        return
      }

      // Generate SWIFT message
      const swiftContent = generateSwiftMessage()

      // Send message
      const response = await api.post('/user/messages', {
        messageType: messageData.messageType,
        senderBIC: messageData.senderBIC,
        receiverBIC: messageData.receiverBIC,
        correspondentBank: messageData.correspondentBank,
        amount: messageData.amount,
        currency: messageData.currency,
        priority: messageData.priority,
        content: swiftContent,
        textBlock: messageData.textBlock,
        routingMethod: selectedRoute?.method,
        estimatedCost: estimatedCost
      })

      setSuccessModal({
        isOpen: true,
        message: `Message sent successfully! Tracking ID: ${response.data.trackingId}`
      })

      // Reset form
      setMessageData({
        messageType: 'MT103',
        senderBIC: '',
        receiverBIC: '',
        correspondentBank: '',
        amount: '',
        currency: 'USD',
        priority: 'normal',
        textBlock: {}
      })
      setSelectedRoute(null)
      setEstimatedCost(0)
      setEstimatedDelivery('')

      if (onMessageSent) {
        onMessageSent(response.data)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Sending Message',
        message: error.response?.data?.message || 'Failed to send message',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  return (
    <>
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 font-mono">Send SWIFT Message</h3>
              <p className="text-sm text-gray-600 font-mono">Create and send SWIFT messages with smart routing</p>
            </div>
            <Badge variant="info">
              Smart Routing Enabled
            </Badge>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Message Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-mono mb-2">
                Message Type
              </label>
              <select
                value={messageData.messageType}
                onChange={(e) => handleInputChange('messageType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              >
                {Object.entries(swiftFieldDefinitions).map(([type, config]) => (
                  <option key={type} value={type}>
                    {type} - {config.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Routing Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Sender BIC"
                  value={messageData.senderBIC}
                  onChange={(e) => handleInputChange('senderBIC', e.target.value)}
                  placeholder="YOURBICXXX"
                  required
                />
              </div>
              <div>
                <Input
                  label="Receiver BIC"
                  value={messageData.receiverBIC}
                  onChange={(e) => handleInputChange('receiverBIC', e.target.value)}
                  placeholder="BENEFBICXXX"
                  required
                />
              </div>
            </div>

            {/* Correspondent Bank Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-mono mb-2">
                Correspondent Bank (Optional)
              </label>
              <select
                value={messageData.correspondentBank}
                onChange={(e) => handleInputChange('correspondentBank', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              >
                <option value="">Auto-select (Recommended)</option>
                {correspondentBanks.map(bank => (
                  <option key={bank.id} value={bank.bic_code}>
                    {bank.name} ({bank.bic_code}) - {bank.country}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 font-mono mt-1">
                Select a specific correspondent bank or let smart routing choose the best option
              </p>
            </div>

            {/* Amount and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  value={messageData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="10000.00"
                />
              </div>
              <div>
                <Input
                  label="Currency"
                  value={messageData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  placeholder="USD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 font-mono mb-2">
                  Priority
                </label>
                <select
                  value={messageData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Routing Options */}
            {routingOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 font-mono mb-2">
                  Smart Routing Options
                </label>
                <div className="space-y-2">
                  {routingOptions.map((route, index) => (
                    <div
                      key={route.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedRoute?.id === route.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedRoute(route)
                        setEstimatedCost(route.estimatedCost)
                        setEstimatedDelivery(route.estimatedDelivery)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            route.priority === 'urgent' ? 'bg-red-500' :
                            route.priority === 'high' ? 'bg-orange-500' :
                            'bg-green-500'
                          }`}></div>
                          <div>
                            <div className="font-medium text-gray-900 font-mono">
                              {route.method.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {route.estimatedSpeed}h delivery • {Math.round(route.reliability * 100)}% reliable
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 font-mono">
                            {formatCurrency(route.estimatedCost)}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            Est. cost
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SWIFT Fields */}
            <div>
              <h4 className="text-md font-medium text-gray-900 font-mono mb-4">
                SWIFT Message Fields
              </h4>
              <div className="space-y-4">
                {swiftFieldDefinitions[messageData.messageType]?.fields.map(field => (
                  <div key={field.tag}>
                    <label className="block text-sm font-medium text-gray-700 font-mono mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={messageData.textBlock[field.tag] || ''}
                        onChange={(e) => handleFieldChange(field.tag, e.target.value)}
                        placeholder={field.example}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
                      />
                    ) : field.options ? (
                      <select
                        value={messageData.textBlock[field.tag] || ''}
                        onChange={(e) => handleFieldChange(field.tag, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      >
                        <option value="">Select option</option>
                        {field.options.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={messageData.textBlock[field.tag] || ''}
                        onChange={(e) => handleFieldChange(field.tag, e.target.value)}
                        placeholder={field.example}
                        required={field.required}
                      />
                    )}
                    {field.example && (
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        Example: {field.example}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Summary */}
            {selectedRoute && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 font-mono mb-3">
                  Message Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 font-mono">Routing Method</div>
                    <div className="font-semibold text-gray-900 font-mono">
                      {selectedRoute.method.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-mono">Estimated Cost</div>
                    <div className="font-semibold text-gray-900 font-mono">
                      {formatCurrency(estimatedCost)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-mono">Delivery Time</div>
                    <div className="font-semibold text-gray-900 font-mono">
                      {estimatedDelivery}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={loading || !selectedRoute}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send mr-2"></i>
                    Send Message
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => {
                  setMessageData({
                    messageType: 'MT103',
                    senderBIC: '',
                    receiverBIC: '',
                    correspondentBank: '',
                    amount: '',
                    currency: 'USD',
                    priority: 'normal',
                    textBlock: {}
                  })
                  setSelectedRoute(null)
                  setEstimatedCost(0)
                  setEstimatedDelivery('')
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </div>
      </Card>

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

export default SwiftMessageInputEnhanced
