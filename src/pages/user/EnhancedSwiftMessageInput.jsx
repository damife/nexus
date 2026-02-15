import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import MessagePrioritySelector from '../../components/MessagePrioritySelector'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'

const EnhancedSwiftMessageInput = () => {
  const navigate = useNavigate()
  const [messageTypes, setMessageTypes] = useState([])
  const [selectedType, setSelectedType] = useState('')
  const [priority, setPriority] = useState('normal')
  const [viewMode, setViewMode] = useState('form') // 'form' or 'blocks'
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  const [validationWarnings, setValidationWarnings] = useState([])
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

  // Enhanced SWIFT field definitions with industry standards
  const swiftFieldDefinitions = {
    'MT103': {
      name: 'Single Customer Credit Transfer',
      description: 'Customer credit transfer - most common payment message',
      category: 'payment',
      fields: [
        { 
          tag: '20', 
          label: 'Transaction Reference Number', 
          required: true, 
          example: 'REF123456789',
          validation: '1-16 characters, alphanumeric',
          help: 'Unique reference for this transaction'
        },
        { 
          tag: '23B', 
          label: 'Bank Operation Code', 
          required: true, 
          options: ['CRED', 'SPAY', 'SPRI', 'SSTD'], 
          example: 'CRED',
          help: 'CRED=Credit, SPAY=Special Payment, SPRI=Special Priority, SSTD=Standard Settlement'
        },
        { 
          tag: '32A', 
          label: 'Value Date/Currency/Interbank Settled Amount', 
          required: true, 
          example: '241231USD10000,00',
          validation: 'YYMMDDCCCAMOUNT',
          help: 'Value date (YYMMDD), currency code, amount with comma as decimal separator'
        },
        { 
          tag: '50K', 
          label: 'Ordering Customer', 
          required: true, 
          type: 'textarea', 
          example: '/1234567890\nJOHN DOE\n123 MAIN ST\nNEW YORK, NY 10001',
          validation: 'Account number starting with /, then name and address',
          help: 'Customer initiating the payment'
        },
        { 
          tag: '59', 
          label: 'Beneficiary Customer', 
          required: true, 
          type: 'textarea', 
          example: '/9876543210\nJANE SMITH\n456 OAK AVE\nLONDON SW1A 0AA',
          validation: 'Account number starting with /, then name and address',
          help: 'Customer receiving the payment'
        },
        { 
          tag: '70', 
          label: 'Remittance Information', 
          type: 'textarea', 
          example: 'Invoice INV-2024-001 for services rendered',
          validation: 'Max 140 characters',
          help: 'Purpose of payment'
        },
        { 
          tag: '71A', 
          label: 'Details of Charges', 
          options: ['OUR', 'SHA', 'BEN'], 
          example: 'SHA',
          help: 'OUR=Sender pays all, SHA=Share charges, BEN=Beneficiary pays all'
        },
        { 
          tag: '72', 
          label: 'Sender to Receiver Information', 
          type: 'textarea', 
          example: '/ACC/Account information',
          validation: 'Start with /CODE/ format',
          help: 'Additional information between banks'
        }
      ]
    },
    'MT202': {
      name: 'General Financial Institution Transfer',
      description: 'Bank-to-bank transfer for financial institutions',
      category: 'bank',
      fields: [
        { 
          tag: '20', 
          label: 'Transaction Reference Number', 
          required: true, 
          example: 'REF789012345',
          validation: '1-16 characters, alphanumeric'
        },
        { 
          tag: '21', 
          label: 'Related Reference', 
          example: 'REF123456789',
          help: 'Reference to related transaction'
        },
        { 
          tag: '32A', 
          label: 'Value Date/Currency/Interbank Settled Amount', 
          required: true, 
          example: '241231USD50000,00',
          validation: 'YYMMDDCCCAMOUNT'
        },
        { 
          tag: '56A', 
          label: 'Intermediary Institution', 
          example: 'CHASUS33XXX',
          validation: 'Valid BIC code',
          help: 'Bank through which payment is routed'
        },
        { 
          tag: '57A', 
          label: 'Account With Institution', 
          example: 'DEUTDEFFXXX',
          validation: 'Valid BIC code',
          help: 'Bank where beneficiary account is held'
        },
        { 
          tag: '58A', 
          label: 'Beneficiary Institution', 
          required: true, 
          example: 'BARCGB22XXX',
          validation: 'Valid BIC code',
          help: 'Final receiving bank'
        }
      ]
    },
    'MT940': {
      name: 'Customer Statement Message',
      description: 'Customer account statement',
      category: 'statement',
      fields: [
        { 
          tag: '20', 
          label: 'Transaction Reference Number', 
          required: true, 
          example: 'STATEMENT001',
          validation: '1-16 characters, alphanumeric'
        },
        { 
          tag: '25', 
          label: 'Account Identification', 
          required: true, 
          example: '1234567890123456',
          validation: 'Account number'
        },
        { 
          tag: '28C', 
          label: 'Statement Number', 
          required: true, 
          example: '1/1',
          validation: 'Statement number/sequence'
        },
        { 
          tag: '60F', 
          label: 'Opening Balance', 
          required: true, 
          example: 'C241201USD10000,00',
          validation: 'C/D + YYMMDD + CC + AMOUNT',
          help: 'C=Credit, D=Debit'
        },
        { 
          tag: '61', 
          label: 'Statement Line', 
          required: true, 
          example: '241202C1234,56NMSCNONREF',
          validation: 'Date + C/D + amount + type + code + reference'
        },
        { 
          tag: '62F', 
          label: 'Closing Balance', 
          required: true, 
          example: 'C241201USD15000,00',
          validation: 'C/D + YYMMDD + CC + AMOUNT'
        }
      ]
    }
  }

  // ISO 20022 MX message types
  const mxMessageTypes = {
    'pacs.008': {
      name: 'FIToFICustomerCreditTransfer',
      description: 'ISO 20022 Customer Credit Transfer',
      category: 'payment',
      xmlStructure: true
    },
    'pacs.009': {
      name: 'FIToFICustomerCreditTransferInitiation',
      description: 'ISO 20022 Credit Transfer Initiation',
      category: 'payment',
      xmlStructure: true
    }
  }

  useEffect(() => {
    const types = [
      ...Object.keys(swiftFieldDefinitions).map(key => ({
        value: key,
        label: `${key} - ${swiftFieldDefinitions[key].name}`,
        category: swiftFieldDefinitions[key].category,
        description: swiftFieldDefinitions[key].description
      })),
      ...Object.keys(mxMessageTypes).map(key => ({
        value: key,
        label: `${key} - ${mxMessageTypes[key].name}`,
        category: 'iso20022',
        description: mxMessageTypes[key].description
      }))
    ]
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

  const validateMessage = () => {
    const errors = []
    const warnings = []
    
    // Validate BIC codes
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

    // Industry standard validations
    if (formData.textBlock['32A']) {
      const amountMatch = formData.textBlock['32A'].match(/[A-Z]{3}([0-9,]+)$/)
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(',', ''))
        if (amount > 1000000) {
          warnings.push('High-value transaction (>1M USD) may require additional compliance checks')
        }
        if (amount && /^[0-9]+,00$/.test(amountMatch[1])) {
          warnings.push('Round amount detected - potential structuring concern')
        }
      }
    }

    setValidationErrors(errors)
    setValidationWarnings(warnings)
    
    return { errors, warnings }
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

  const handleSend = async () => {
    const validation = validateMessage()
    if (validation.errors.length > 0) {
      setErrorModal({
        isOpen: true,
        title: 'Validation Errors',
        message: 'Please fix the errors below',
        errors: validation.errors
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
  const currentMessageType = swiftFieldDefinitions[selectedType]

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">New SWIFT Message</h1>
            <p className="text-gray-600 font-mono">Create and send SWIFT messages using industry-standard formatting</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="text-sm text-gray-600 font-mono mt-1">{type.label.split(' - ')[1]}</div>
                <div className="text-xs text-gray-500 mt-2">{type.description}</div>
                <div className="mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-mono ${
                    type.category === 'payment' ? 'bg-green-100 text-green-800' :
                    type.category === 'bank' ? 'bg-blue-100 text-blue-800' :
                    type.category === 'statement' ? 'bg-orange-100 text-orange-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {type.category.toUpperCase()}
                  </span>
                </div>
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

        {selectedType && currentMessageType && (
          <>
            {/* Message Type Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <i className="bi bi-info-circle text-blue-600 text-xl mt-1"></i>
                <div>
                  <h4 className="font-semibold text-blue-900 font-mono">{currentMessageType.name}</h4>
                  <p className="text-blue-800 text-sm mt-1">{currentMessageType.description}</p>
                </div>
              </div>
            </div>

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
                  <div className="text-xs text-gray-500 mt-1 font-mono">8-11 characters: 6 letters + 2 letters/digits + optional 3 letters/digits</div>
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
                  <div className="text-xs text-gray-500 mt-1 font-mono">8-11 characters: 6 letters + 2 letters/digits + optional 3 letters/digits</div>
                </div>
              </div>
            </div>

            {/* Block 4: Text Block */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4 flex items-center gap-2">
                <i className="bi bi-file-text text-blue-600"></i>
                Message Content (Block 4)
              </h3>
              <div className="space-y-6">
                {currentFields.map(field => (
                  <div key={field.tag} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">
                      Field {field.tag}: {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.help && (
                      <div className="text-xs text-blue-600 mb-2 font-mono">
                        <i className="bi bi-info-circle"></i> {field.help}
                      </div>
                    )}
                    
                    {field.type === 'textarea' ? (
                      <textarea
                        value={formData.textBlock[field.tag] || ''}
                        onChange={(e) => handleTextBlockFieldChange(field.tag, e.target.value)}
                        placeholder={field.example}
                        required={field.required}
                        rows={field.tag === '50K' || field.tag === '59' ? 4 : 2}
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
                          <option key={option} value={option}>{option} - {field.example}</option>
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
                    
                    {field.validation && (
                      <div className="text-xs text-gray-500 mt-1 font-mono">
                        Format: {field.validation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Results */}
            {(validationErrors.length > 0 || validationWarnings.length > 0) && (
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Validation Results</h3>
                
                {validationErrors.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-red-800 font-mono mb-2">Errors ({validationErrors.length})</h4>
                    <div className="space-y-2">
                      {validationErrors.map((error, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <i className="bi bi-exclamation-triangle text-red-600 mt-0.5"></i>
                          <div>
                            <div className="text-sm font-medium text-red-800 font-mono">{error.field}</div>
                            <div className="text-sm text-red-700 font-mono">{error.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {validationWarnings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-orange-800 font-mono mb-2">Warnings ({validationWarnings.length})</h4>
                    <div className="space-y-2">
                      {validationWarnings.map((warning, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <i className="bi bi-exclamation-triangle text-orange-600 mt-0.5"></i>
                          <div className="text-sm text-orange-800 font-mono">{warning}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                className="btn btn-secondary"
                onClick={validateMessage}
                disabled={loading}
              >
                <i className="bi bi-check-circle mr-2"></i>
                Validate
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSend}
                disabled={loading || validationErrors.length > 0}
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

export default EnhancedSwiftMessageInput
