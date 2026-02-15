import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'
import { Card, Button, Input, Badge } from '../../components/UIComponents'

const TwoFactorAuth = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  
  const [user, setUser] = useState(null)
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [setupData, setSetupData] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [showDisable, setShowDisable] = useState(false)
  const [backupCodes, setBackupCodes] = useState([])

  useEffect(() => {
    fetchUserStatus()
  }, [])

  const fetchUserStatus = async () => {
    try {
      const response = await api.get('/user/2fa-status')
      setUser(response.data.user)
      setTotpEnabled(response.data.totpEnabled)
    } catch (error) {
      console.error('Error fetching 2FA status:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading 2FA Status',
        message: error.response?.data?.message || 'Failed to load 2FA status',
        errors: error.response?.data?.errors || []
      })
    }
  }

  const setup2FA = async () => {
    try {
      setLoading(true)
      const response = await api.post('/user/2fa/setup')
      setSetupData(response.data)
      setBackupCodes(response.data.backupCodes)
      setShowSetup(true)
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Setting Up 2FA',
        message: error.response?.data?.message || 'Failed to setup 2FA',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const verifyAndEnable2FA = async () => {
    try {
      setLoading(true)
      await api.post('/user/2fa/verify', {
        code: verificationCode,
        secret: setupData.secret
      })
      
      setSuccessModal({
        isOpen: true,
        message: 'Two-factor authentication has been successfully enabled!'
      })
      
      setTotpEnabled(true)
      setShowSetup(false)
      setVerificationCode('')
      setSetupData(null)
    } catch (error) {
      console.error('Error verifying 2FA:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Verifying 2FA',
        message: error.response?.data?.message || 'Invalid verification code',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const disable2FA = async () => {
    try {
      setLoading(true)
      await api.post('/user/2fa/disable', {
        password: currentPassword
      })
      
      setSuccessModal({
        isOpen: true,
        message: 'Two-factor authentication has been disabled.'
      })
      
      setTotpEnabled(false)
      setShowDisable(false)
      setCurrentPassword('')
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Disabling 2FA',
        message: error.response?.data?.message || 'Failed to disable 2FA',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'swift-nexus-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setSuccessModal({
      isOpen: true,
      message: 'Backup codes copied to clipboard!'
    })
  }

  if (!user) {
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
          <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Two-Factor Authentication</h1>
          <p className="text-gray-600 font-mono">Add an extra layer of security to your account</p>
        </div>

        {/* Status Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  totpEnabled ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <i className={`bi bi-shield-lock text-xl ${
                    totpEnabled ? 'text-green-600' : 'text-gray-600'
                  }`}></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 font-mono">2FA Status</h3>
                  <p className="text-sm text-gray-600 font-mono">
                    {totpEnabled ? 'Two-factor authentication is enabled' : 'Two-factor authentication is disabled'}
                  </p>
                </div>
              </div>
              <Badge variant={totpEnabled ? 'success' : 'secondary'}>
                {totpEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Setup 2FA */}
        {!totpEnabled && !showSetup && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Enable Two-Factor Authentication</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 font-mono mb-2">Why enable 2FA?</h4>
                  <ul className="text-sm text-blue-800 font-mono space-y-1">
                    <li>• Extra security layer beyond password</li>
                    <li>• Protection against unauthorized access</li>
                    <li>• Required for admin and high-value transactions</li>
                    <li>• Industry-standard security practice</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={setup2FA}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Setting up...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-plus mr-2"></i>
                      Enable Two-Factor Authentication
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Setup Process */}
        {showSetup && setupData && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Setup Two-Factor Authentication</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* QR Code */}
                <div className="text-center">
                  <h4 className="font-medium text-gray-900 font-mono mb-3">Step 1: Scan QR Code</h4>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
                    {setupData.qrCode && (
                      <img src={setupData.qrCode} alt="QR Code" className="w-48 h-48" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-mono mt-2">
                    Use Google Authenticator, Authy, or similar app
                  </p>
                </div>

                {/* Manual Entry */}
                <div>
                  <h4 className="font-medium text-gray-900 font-mono mb-3">Step 2: Manual Entry</h4>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 font-mono mb-1">Manual Entry Key:</p>
                    <p className="font-mono text-sm break-all">{setupData.manualEntryKey}</p>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 font-mono mb-3 mt-6">Step 3: Verify Setup</h4>
                  <Input
                    label="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="mb-4"
                  />
                  
                  <Button 
                    onClick={verifyAndEnable2FA}
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle mr-2"></i>
                        Verify and Enable
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Backup Codes */}
              {backupCodes.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 font-mono mb-3">⚠️ Backup Codes</h4>
                  <p className="text-sm text-yellow-800 font-mono mb-3">
                    Save these backup codes in a secure location. You can use them if you lose access to your authenticator app.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="bg-white p-2 rounded border border-yellow-300">
                        <code className="text-xs font-mono">{code}</code>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      onClick={downloadBackupCodes}
                      className="flex-1"
                    >
                      <i className="bi bi-download mr-2"></i>
                      Download
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={copyBackupCodes}
                      className="flex-1"
                    >
                      <i className="bi bi-clipboard mr-2"></i>
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Disable 2FA */}
        {totpEnabled && !showDisable && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Disable Two-Factor Authentication</h3>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 font-mono mb-2">⚠️ Security Warning</h4>
                  <p className="text-sm text-red-800 font-mono">
                    Disabling 2FA reduces your account security. This action is not recommended for admin accounts.
                  </p>
                </div>
                
                <Button 
                  variant="danger"
                  onClick={() => setShowDisable(true)}
                  className="w-full"
                >
                  <i className="bi bi-shield-x mr-2"></i>
                  Disable Two-Factor Authentication
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Disable Confirmation */}
        {showDisable && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Confirm Disable 2FA</h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 font-mono">
                  Enter your password to confirm disabling two-factor authentication.
                </p>
                
                <Input
                  type="password"
                  label="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                
                <div className="flex gap-3">
                  <Button 
                    variant="secondary"
                    onClick={() => setShowDisable(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="danger"
                    onClick={disable2FA}
                    disabled={loading || !currentPassword}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Disabling...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-shield-x mr-2"></i>
                        Disable 2FA
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Security Tips */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Security Tips</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <i className="bi bi-check-circle text-green-600 mt-0.5"></i>
                <div>
                  <p className="text-sm font-medium text-gray-900 font-mono">Use a reputable authenticator app</p>
                  <p className="text-xs text-gray-600 font-mono">Google Authenticator, Authy, Microsoft Authenticator</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <i className="bi bi-check-circle text-green-600 mt-0.5"></i>
                <div>
                  <p className="text-sm font-medium text-gray-900 font-mono">Save backup codes securely</p>
                  <p className="text-xs text-gray-600 font-mono">Store them in a secure, offline location</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <i className="bi bi-check-circle text-green-600 mt-0.5"></i>
                <div>
                  <p className="text-sm font-medium text-gray-900 font-mono">Keep your app updated</p>
                  <p className="text-xs text-gray-600 font-mono">Regular updates ensure the latest security features</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <i className="bi bi-check-circle text-green-600 mt-0.5"></i>
                <div>
                  <p className="text-sm font-medium text-gray-900 font-mono">Test your backup codes</p>
                  <p className="text-xs text-gray-600 font-mono">Verify they work before you need them</p>
                </div>
              </div>
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

export default TwoFactorAuth
