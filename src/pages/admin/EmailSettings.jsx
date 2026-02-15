import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'
import { Card, Button, Input, Badge } from '../../components/UIComponents'

const EmailSettings = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  
  const [emailSettings, setEmailSettings] = useState({
    resendApiKey: '',
    resendFromEmail: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    emailProvider: 'resend', // 'resend' or 'smtp'
    testEmail: ''
  })

  const [testResult, setTestResult] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    fetchEmailSettings()
  }, [])

  const fetchEmailSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/settings/email')
      setEmailSettings(response.data.settings || {})
    } catch (error) {
      console.error('Error fetching email settings:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Email Settings',
        message: error.response?.data?.message || 'Failed to load email settings',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const saveEmailSettings = async () => {
    try {
      setLoading(true)
      await api.post('/admin/settings/email', emailSettings)
      
      setSuccessModal({
        isOpen: true,
        message: 'Email settings saved successfully!'
      })
    } catch (error) {
      console.error('Error saving email settings:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Saving Email Settings',
        message: error.response?.data?.message || 'Failed to save email settings',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const testEmailConfiguration = async () => {
    try {
      setLoading(true)
      const response = await api.post('/admin/settings/email/test', {
        to: emailSettings.testEmail,
        provider: emailSettings.emailProvider
      })
      
      setTestResult({
        success: true,
        message: 'Test email sent successfully!'
      })
    } catch (error) {
      console.error('Error testing email configuration:', error)
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Failed to send test email'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setEmailSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getStatusColor = (configured) => {
    return configured ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'
  }

  const isResendConfigured = emailSettings.resendApiKey && emailSettings.resendFromEmail
  const isSMTPConfigured = emailSettings.smtpHost && emailSettings.smtpPort && emailSettings.smtpUser && emailSettings.smtpPass

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Email Settings</h1>
            <p className="text-gray-600 font-mono">Configure email service providers and settings</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={fetchEmailSettings} disabled={loading}>
              <i className="bi bi-arrow-clockwise mr-2"></i>
              Refresh
            </Button>
            <Button onClick={saveEmailSettings} disabled={loading}>
              {loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle mr-2"></i>
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Email Provider Selection */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Email Provider</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  emailSettings.emailProvider === 'resend' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleInputChange('emailProvider', 'resend')}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 font-mono">Resend</h4>
                  <Badge variant={isResendConfigured ? 'success' : 'secondary'} size="sm">
                    {isResendConfigured ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 font-mono">
                  Modern email API service with reliable delivery and analytics
                </p>
                <div className="mt-2 text-xs text-gray-500 font-mono">
                  Recommended for production use
                </div>
              </div>

              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  emailSettings.emailProvider === 'smtp' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleInputChange('emailProvider', 'smtp')}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 font-mono">SMTP</h4>
                  <Badge variant={isSMTPConfigured ? 'success' : 'secondary'} size="sm">
                    {isSMTPConfigured ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 font-mono">
                  Traditional SMTP server configuration for custom email providers
                </p>
                <div className="mt-2 text-xs text-gray-500 font-mono">
                  Use with Gmail, Outlook, or custom SMTP servers
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Resend Configuration */}
        {emailSettings.emailProvider === 'resend' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-envelope text-blue-600 text-xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 font-mono">Resend Configuration</h3>
                  <p className="text-sm text-gray-600 font-mono">Configure Resend API settings</p>
                </div>
                <Badge variant={isResendConfigured ? 'success' : 'secondary'}>
                  {isResendConfigured ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="Resend API Key"
                    type="password"
                    value={emailSettings.resendApiKey}
                    onChange={(e) => handleInputChange('resendApiKey', e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                    helper="Get your API key from Resend dashboard"
                  />
                </div>
                <div>
                  <Input
                    label="From Email Address"
                    type="email"
                    value={emailSettings.resendFromEmail}
                    onChange={(e) => handleInputChange('resendFromEmail', e.target.value)}
                    placeholder="noreply@yourbank.com"
                    helper="Email address that will appear as sender"
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 font-mono mb-2">Resend Setup Instructions:</h4>
                <ol className="text-sm text-blue-800 font-mono space-y-1">
                  <li>1. Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a></li>
                  <li>2. Create a new API key in your dashboard</li>
                  <li>3. Verify your domain for sending emails</li>
                  <li>4. Copy the API key and from email address above</li>
                </ol>
              </div>
            </div>
          </Card>
        )}

        {/* SMTP Configuration */}
        {emailSettings.emailProvider === 'smtp' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="bi bi-server text-green-600 text-xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 font-mono">SMTP Configuration</h3>
                  <p className="text-sm text-gray-600 font-mono">Configure SMTP server settings</p>
                </div>
                <Badge variant={isSMTPConfigured ? 'success' : 'secondary'}>
                  {isSMTPConfigured ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="SMTP Host"
                    value={emailSettings.smtpHost}
                    onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                    helper="SMTP server hostname"
                  />
                </div>
                <div>
                  <Input
                    label="SMTP Port"
                    type="number"
                    value={emailSettings.smtpPort}
                    onChange={(e) => handleInputChange('smtpPort', e.target.value)}
                    placeholder="587"
                    helper="Usually 587 (TLS) or 465 (SSL)"
                  />
                </div>
                <div>
                  <Input
                    label="SMTP Username"
                    value={emailSettings.smtpUser}
                    onChange={(e) => handleInputChange('smtpUser', e.target.value)}
                    placeholder="your-email@gmail.com"
                    helper="SMTP authentication username"
                  />
                </div>
                <div>
                  <Input
                    label="SMTP Password"
                    type={showPassword ? 'text' : 'password'}
                    value={emailSettings.smtpPass}
                    onChange={(e) => handleInputChange('smtpPass', e.target.value)}
                    placeholder="Your app password"
                    helper="Use app-specific password for Gmail"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-mono"
                  >
                    {showPassword ? 'Hide Password' : 'Show Password'}
                  </button>
                </div>
              </div>

              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 font-mono mb-2">SMTP Setup Instructions:</h4>
                <div className="text-sm text-green-800 font-mono space-y-2">
                  <div>
                    <strong>Gmail:</strong> Use App Password instead of regular password
                  </div>
                  <div>
                    <strong>Outlook:</strong> Use SMTP server: smtp-mail.outlook.com:587
                  </div>
                  <div>
                    <strong>Custom:</strong> Contact your email provider for SMTP settings
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Test Email Configuration */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Test Email Configuration</h3>
            <div className="space-y-4">
              <div>
                <Input
                  label="Test Email Address"
                  type="email"
                  value={emailSettings.testEmail}
                  onChange={(e) => handleInputChange('testEmail', e.target.value)}
                  placeholder="test@example.com"
                  helper="Send a test email to verify configuration"
                />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={testEmailConfiguration}
                  disabled={loading || !emailSettings.testEmail || (!isResendConfigured && !isSMTPConfigured)}
                >
                  {loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send mr-2"></i>
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>

              {testResult && (
                <div className={`p-4 rounded-lg border ${
                  testResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <i className={`bi ${testResult.success ? 'bi-check-circle' : 'bi-x-circle'} ${
                      testResult.success ? 'text-green-600' : 'text-red-600'
                    }`}></i>
                    <span className={`font-medium font-mono ${
                      testResult.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {testResult.success ? 'Success' : 'Error'}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm font-mono ${
                    testResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResult.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Environment Variables Info */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Environment Variables</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 font-mono mb-3">
                These settings are also configurable via environment variables:
              </p>
              <div className="space-y-2 font-mono text-xs">
                <div className="bg-white p-2 rounded border border-gray-300">
                  <strong>Resend:</strong> RESEND_API_KEY, RESEND_FROM_EMAIL
                </div>
                <div className="bg-white p-2 rounded border border-gray-300">
                  <strong>SMTP:</strong> SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
                </div>
              </div>
              <p className="text-sm text-gray-600 font-mono mt-3">
                Environment variables take precedence over UI settings.
              </p>
            </div>
          </div>
        </Card>
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

export default EmailSettings
