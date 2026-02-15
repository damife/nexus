import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import MessagePrioritySelector from '../../components/MessagePrioritySelector'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'

const SwiftMessageInput = () => {
  const navigate = useNavigate()
  const [messageTypes, setMessageTypes] = useState([])
  const [selectedType, setSelectedType] = useState('')
  const [priority, setPriority] = useState('normal')
  const [viewMode, setViewMode] = useState('form') // 'form' or 'blocks'
  const [loading, setLoading] = useState(false)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  
  // Form data for different message types
  const [formData, setFormData] = useState({
    // Block 1: Basic Header
    applicationId: 'F',
    serviceId: '01',
    senderBIC: '',
    receiverBIC: '',
    sessionNumber: '',
    sequenceNumber: '',
    
    // Block 2: Application Header
    direction: 'I',
    messageType: '',
    priority: 'N',
    deliveryMonitoring: '',
    obsolescencePeriod: '',
    
    // Block 3: User Header (optional)
    userHeader: {},
    
    // Block 4: Text Block (message content)
    textBlock: {},
    
    // Block 5: Trailer
    trailer: {}
  })

  // SWIFT field definitions for different message types
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
    const types = Object.keys(swiftFieldDefinitions).map(key => ({
      value: key,
      label: `${key} - ${swiftFieldDefinitions[key].name}`
    }))
    setMessageTypes(types)
  }, [])

  const handleFieldChange = (block, field, value) => {
    setFormData(prev => ({
      ...prev,
      [block]: {
        ...prev[block],
        [field]: value
      }
    }))
  }

  const handleTextBlockFieldChange = (tag, value) => {
    setFormData(prev => ({
      ...prev,
      textBlock: {
        ...prev.textBlock,
        [tag]: value
      }
    }))
  }

  const generateSwiftMessage = () => {
    if (!selectedType) return ''

    // Generate Block 1
    const block1 = `{1:${formData.applicationId}${formData.serviceId}${formData.senderBIC}${formData.receiverBIC}${formData.sessionNumber || Date.now().toString().slice(-6)}${formData.sequenceNumber || '000000'}}`

    // Generate Block 2
    const messageType = selectedType.replace('MT', '')
    const block2 = `{2:${formData.direction}${messageType}${priority === 'urgent' ? 'U' : priority === 'system' ? 'S' : 'N'}${formData.deliveryMonitoring || ''}${formData.obsolescencePeriod || ''}${formData.receiverBIC}}`

    // Generate Block 3 (optional)
    let block3 = ''
    if (Object.keys(formData.userHeader).length > 0) {
      const userHeaderFields = Object.entries(formData.userHeader)
        .map(([key, value]) => `${key}:${value}`)
        .join('\n')
      block3 = `{3:{${userHeaderFields}}}`
    }

    // Generate Block 4 (Text Block)
    let block4 = '{4:\n'
    const currentFields = swiftFieldDefinitions[selectedType]?.fields || []
    currentFields.forEach(field => {
      const value = formData.textBlock[field.tag]
      if (value) {
        block4 += `:${field.tag}:${value}\n`
      }
    })
    block4 += '-}'

    // Generate Block 5
    const block5 = `{5:{CHK:${Date.now().toString().slice(-6)}}}`

    return `${block1}\n${block2}\n${block3}\n${block4}\n${block5}`
  }

  const validateMessage = () => {
    const errors = []
    
    if (!formData.senderBIC || formData.senderBIC.length < 8) {
      errors.push({ field: 'senderBIC', message: 'Invalid sender BIC (must be 8-11 characters)' })
    }
    
    if (!formData.receiverBIC || formData.receiverBIC.length < 8) {
      errors.push({ field: 'receiverBIC', message: 'Invalid receiver BIC (must be 8-11 characters)' })
    }
    
    if (!selectedType) {
      errors.push({ field: 'messageType', message: 'Please select a message type' })
    }

    // Validate required fields for selected message type
    const currentFields = swiftFieldDefinitions[selectedType]?.fields || []
    currentFields.forEach(field => {
      if (field.required && !formData.textBlock[field.tag]) {
        errors.push({ field: field.tag, message: `${field.label} is required` })
      }
    })

    return errors
  }

  const handleSend = async () => {
    const errors = validateMessage()
    if (errors.length > 0) {
      setErrorModal({
        isOpen: true,
        title: 'Validation Errors',
        message: 'Please fix the errors below',
        errors
      })
      return
    }

    setLoading(true)
    try {
      const swiftContent = generateSwiftMessage()
      
      const payload = {
        messageType: selectedType,
        senderBIC: formData.senderBIC,
        receiverBIC: formData.receiverBIC,
        content: swiftContent,
        priority,
        amount: formData.textBlock['32A']?.match(/[A-Z]{3}\s*[\d,]+/)?.[1]?.replace(',', '') || 0,
        currency: formData.textBlock['32A']?.match(/([A-Z]{3})/)?.[1] || 'USD'
      }

      const response = await api.post('/messages', payload)
      
      setSuccessModal({
        isOpen: true,
        message: `Message sent successfully! UTR: ${response.data.data?.utr}`
      })
      
      // Reset form
      setTimeout(() => {
        navigate('/user/history')
      }, 2000)
      
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

  const currentFields = swiftFieldDefinitions[selectedType]?.fields || []

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">New SWIFT Message</h1>
            <p className="text-gray-600 font-mono">Create and send SWIFT messages using proper format</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              className={`px-4 py-2 rounded-md font-mono text-sm font-medium transition-all ${
                viewMode === 'form' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setViewMode('form')}
            >
              <i className="bi bi-file-text mr-2"></i>
              Form View
            </button>
            <button
              className={`px-4 py-2 rounded-md font-mono text-sm font-medium transition-all ${
                viewMode === 'blocks' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setViewMode('blocks')}
            >
              <i className="bi bi-code-slash mr-2"></i>
              Block View
            </button>
          </div>
        </div>

        {/* Message Type Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Message Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {messageTypes.map(type => (
              <div
                key={type.value}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedType(type.value)}
              >
                <div className="font-semibold text-gray-900 font-mono">{type.value}</div>
                <div className="text-sm text-gray-600 font-mono">{type.label.split(' - ')[1]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <MessagePrioritySelector
            priority={priority}
            onPriorityChange={setPriority}
            disabled={false}
          />
        </div>

        {selectedType && (
          <>
            {/* Block 1 & 2: Basic Headers */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4 flex items-center gap-2">
                <i className="bi bi-header text-blue-600"></i>
                Basic Headers (Block 1 & 2)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">
                    Sender BIC *
                  </label>
                  <input
                    type="text"
                    value={formData.senderBIC}
                    onChange={(e) => handleFieldChange('basic', 'senderBIC', e.target.value.toUpperCase())}
                    placeholder="ABCDUS33XXX"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    maxLength={11}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">
                    Receiver BIC *
                  </label>
                  <input
                    type="text"
                    value={formData.receiverBIC}
                    onChange={(e) => handleFieldChange('basic', 'receiverBIC', e.target.value.toUpperCase())}
                    placeholder="EFGHGB2LXXX"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    maxLength={11}
                  />
                </div>
              </div>
            </div>

            {/* Block 4: Text Block */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4 flex items-center gap-2">
                <i className="bi bi-file-text text-blue-600"></i>
                Message Content (Block 4)
              </h3>
              <div className="space-y-4">
                {currentFields.map(field => (
                  <div key={field.tag} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">
                      Field {field.tag}: {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={formData.textBlock[field.tag] || ''}
                        onChange={(e) => handleTextBlockFieldChange(field.tag, e.target.value)}
                        placeholder={field.example}
                        required={field.required}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      />
                    ) : field.options ? (
                      <select
                        value={formData.textBlock[field.tag] || ''}
                        onChange={(e) => handleTextBlockFieldChange(field.tag, e.target.value)}
                        required={field.required}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono bg-white"
                      >
                        <option value="">-- Select --</option>
                        {field.options.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.textBlock[field.tag] || ''}
                        onChange={(e) => handleTextBlockFieldChange(field.tag, e.target.value)}
                        placeholder={field.example}
                        required={field.required}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4 flex items-center gap-2">
                <i className="bi bi-eye text-blue-600"></i>
                SWIFT Message Preview
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {generateSwiftMessage()}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/user/history')}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSend}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send"></i>
                    Send Message
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

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

export default SwiftMessageInput
