import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../../utils/api'
import ErrorModal from '../../../components/ErrorModal'
import SuccessModal from '../../../components/SuccessModal'

const MessageEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('form')
  const [message, setMessage] = useState(null)
  const [formData, setFormData] = useState({})
  const [rawSwiftText, setRawSwiftText] = useState('')
  const [validationErrors, setValidationErrors] = useState([])
  const [isValidating, setIsValidating] = useState(false)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id && id !== 'new') {
      fetchMessage()
    } else {
      setLoading(false)
    }
  }, [id])

  const fetchMessage = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/messages/${id}`)
      const msg = response.data.message
      setMessage(msg)
      setFormData(msg.form_data || {})
      setRawSwiftText(msg.raw_swift_text || msg.swift_content || '')
      setValidationErrors(msg.validation_errors || [])
    } catch (error) {
      console.error('Error fetching message:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Message',
        message: error.response?.data?.message || 'Failed to load message',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async () => {
    setIsValidating(true)
    try {
      const messageId = id || 'new'
      
      if (messageId === 'new') {
        const errors = validateMessage()
        setValidationErrors(errors)
        setIsValidating(false)
        if (errors.length === 0) {
          setSuccessModal({ isOpen: true, message: 'Message is valid and ready to send!' })
        }
        return
      }

      const response = await api.post(`/messages/${messageId}/validate`)

      setValidationErrors(response.data.errors || [])
      
      if (response.data.valid) {
        setSuccessModal({ isOpen: true, message: 'Message is valid and ready to send!' })
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Validation Failed',
          message: 'Please fix the errors below before sending',
          errors: response.data.errors || []
        })
      }
    } catch (error) {
      console.error('Validation error:', error)
      setErrorModal({
        isOpen: true,
        title: 'Validation Error',
        message: error.response?.data?.message || 'Failed to validate message',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setIsValidating(false)
    }
  }

  const validateMessage = () => {
    const errors = []
    
    if (!formData.senderBIC || formData.senderBIC.length < 8) {
      errors.push({ field: 'senderBIC', message: 'Invalid sender BIC (must be 8-11 characters)' })
    }
    
    if (!formData.receiverBIC || formData.receiverBIC.length < 8) {
      errors.push({ field: 'receiverBIC', message: 'Invalid receiver BIC (must be 8-11 characters)' })
    }
    
    if (formData['32A'] && !formData['32A'].match(/\d{2}[A-Z]{3}\d{4}\s+[A-Z]{3}\s+[\d,]+/)) {
      errors.push({ field: '32A', message: 'Invalid format for Field 32A (Value Date, Currency, Amount)' })
    }
    
    return errors
  }

  const generateSwiftText = () => {
    if (!message) return ''
    
    const block1 = `{1:F01${formData.senderBIC || 'XXXXXXXX'}${formData.receiverBIC || 'XXXXXXXX'}${new Date().toISOString().slice(2, 8).replace(/-/g, '')}${Date.now().toString().slice(-6)}}`
    const block2 = `{2:I${message.message_type.replace('MT', '')}${formData.senderBIC || 'XXXXXXXX'}N}`
    const block3 = `{3:{108:${message.reference || 'REF'}}}`
    let block4 = '{4:\n'
    if (message.form_data) {
      Object.entries(message.form_data).forEach(([key, value]) => {
        if (value && key !== 'senderBIC' && key !== 'receiverBIC') {
          block4 += `:${key}:${value}\n`
        }
      })
    }
    block4 += '-}'
    const block5 = `{5:{CHK:${Date.now().toString().slice(-6)}}}`
    
    return `${block1}\n${block2}\n${block3}\n${block4}\n${block5}`
  }

  const handleSave = async () => {
    try {
      const swiftText = viewMode === 'text' ? rawSwiftText : generateSwiftText()
      
      const payload = {
        messageType: formData.messageType || message?.message_type,
        category: 'mt',
        reference: formData.reference || message?.reference,
        senderBIC: formData.senderBIC,
        receiverBIC: formData.receiverBIC,
        amount: formData.amount,
        currency: formData.currency,
        valueDate: formData.valueDate,
        formData: formData,
        swiftContent: swiftText,
        rawSwiftText: swiftText
      }

      if (id && id !== 'new') {
        await api.patch(`/messages/${id}`, payload)
      } else {
        await api.post('/messages', payload)
      }
      
      setSuccessModal({ isOpen: true, message: 'Message saved successfully!' })
      setTimeout(() => {
        navigate('/user/queue')
      }, 1500)
    } catch (error) {
      console.error('Error saving message:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Saving Message',
        message: error.response?.data?.message || 'Failed to save message',
        errors: error.response?.data?.errors || []
      })
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Message Editor</h1>
            <p className="text-gray-600 font-mono">
              {id === 'new' ? 'Create new SWIFT message' : `Edit Message: ${message?.reference || message?.message_id}`}
            </p>
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
                viewMode === 'text' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setViewMode('text')}
            >
              <i className="bi bi-code-slash mr-2"></i>
              Text View
            </button>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex items-center gap-2 mb-2">
              <i className="bi bi-exclamation-triangle text-red-600 text-xl"></i>
              <strong className="text-red-800 font-mono">Validation Errors ({validationErrors.length})</strong>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-red-700 font-mono text-sm">
                  <strong>{error.field}:</strong> {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          {viewMode === 'form' ? (
            <FormView 
              formData={formData} 
              setFormData={setFormData}
              message={message}
            />
          ) : (
            <TextView 
              rawSwiftText={rawSwiftText}
              setRawSwiftText={setRawSwiftText}
              message={message}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-4 bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <button 
            className="btn btn-secondary"
            onClick={handleValidate}
            disabled={isValidating}
          >
            {isValidating ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                Validating...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle"></i>
                Validate Message
              </>
            )}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/user/queue')}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSave}
          >
            <i className="bi bi-save"></i>
            Save Message
          </button>
        </div>
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

const FormView = ({ formData, setFormData, message }) => {
  const sections = [
    {
      title: 'Header Data (Block 1 & 2)',
      icon: 'bi-file-earmark-text',
      fields: [
        { key: 'senderBIC', label: 'Sender BIC', required: true, placeholder: 'ABCDUS33' },
        { key: 'receiverBIC', label: 'Receiver BIC', required: true, placeholder: 'EFGHGB2L' },
        { key: 'messagePriority', label: 'Message Priority', type: 'select', options: ['Normal', 'Urgent'] }
      ]
    },
    {
      title: 'Payment Details (Block 4: Text Block)',
      icon: 'bi-cash-coin',
      fields: [
        { key: '32A', label: 'Field 32A: Value Date, Currency, Amount', required: true, placeholder: '241231USD10000,' },
        { key: '50K', label: 'Field 50K: Ordering Customer', required: true, type: 'textarea' },
        { key: '59', label: 'Field 59: Beneficiary Customer', required: true, type: 'textarea' },
        { key: '70', label: 'Field 70: Remittance Information', type: 'textarea' },
        { key: '71A', label: 'Field 71A: Details of Charges', type: 'select', options: ['OUR', 'SHA', 'BEN'] }
      ]
    },
    {
      title: 'Settlement Path',
      icon: 'bi-diagram-3',
      fields: [
        { key: '52A', label: 'Field 52A: Ordering Institution' },
        { key: '53A', label: 'Field 53A: Sender\'s Correspondent' },
        { key: '56A', label: 'Field 56A: Intermediary' },
        { key: '57A', label: 'Field 57A: Account With Institution' }
      ]
    }
  ]

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {sections.map((section, index) => (
        <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
          <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4 flex items-center gap-2">
            <i className={`bi ${section.icon} text-blue-600`}></i>
            {section.title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.fields.map(field => (
              <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    required={field.required}
                    className="w-full"
                  >
                    <option value="">-- Select --</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    maxLength={field.maxLength}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const TextView = ({ rawSwiftText, setRawSwiftText, message }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 font-mono mb-2 flex items-center gap-2">
          <i className="bi bi-code-slash text-blue-600"></i>
          Raw SWIFT Message Text
        </h3>
        <p className="text-sm text-gray-600 font-mono mb-4">The actual SWIFT message as it will be transmitted (five blocks)</p>
      </div>
      <div>
        <textarea
          value={rawSwiftText}
          onChange={(e) => setRawSwiftText(e.target.value)}
          className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder={`{1:F01YOURCODEZABC1234567890}
{2:I103...}
{3:{108:TRXREF1234}}
{4:
:20:REF123456
:23B:CRED
:32A:241231USD10000,
:50K:/1234567890
SMITH & CO
:59:/9876543210
JONES LTD...
-}
{5:{CHK:1234567890}}`}
          spellCheck={false}
        />
      </div>
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 font-mono mb-3">SWIFT Message Blocks:</h4>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex items-start gap-2">
            <strong className="text-blue-600">Block 1:</strong>
            <span className="text-gray-700">Basic Header (Sender/Receiver BIC, Date/Time)</span>
          </div>
          <div className="flex items-start gap-2">
            <strong className="text-blue-600">Block 2:</strong>
            <span className="text-gray-700">Application Header (Message Type, Direction)</span>
          </div>
          <div className="flex items-start gap-2">
            <strong className="text-blue-600">Block 3:</strong>
            <span className="text-gray-700">User Header (Optional service codes)</span>
          </div>
          <div className="flex items-start gap-2">
            <strong className="text-blue-600">Block 4:</strong>
            <span className="text-gray-700">Text Block (Message content with field tags)</span>
          </div>
          <div className="flex items-start gap-2">
            <strong className="text-blue-600">Block 5:</strong>
            <span className="text-gray-700">Trailer (Checksum, authentication)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessageEditor
