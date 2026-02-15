import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ErrorModal from '../components/ErrorModal'
import SuccessModal from '../components/SuccessModal'

const Installer = () => {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [success, setSuccess] = useState({ isOpen: false, message: '' })
  const [installed, setInstalled] = useState(false)

  const [dbConfig, setDbConfig] = useState({
    host: '',
    port: process.env.REACT_APP_DB_PORT || '5432',
    database: '',
    user: '',
    password: ''
  })

  const [adminConfig, setAdminConfig] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '',
    secure: false,
    user: '',
    password: '',
    fromEmail: '',
    fromName: ''
  })

  const [paymentConfig, setPaymentConfig] = useState({
    nowpaymentsEnabled: false,
    nowpaymentsApiKey: '',
    nowpaymentsIpnSecret: '',
    payoutWalletAddress: '',
    payoutWalletCurrency: '',
    defaultCurrency: '',
    defaultPrice: ''
  })

  useEffect(() => {
    checkInstallation()
  }, [])

  const checkInstallation = async () => {
    try {
      const response = await axios.get('/api/installer/status')
      if (response.data.installed) {
        setInstalled(true)
      }
    } catch (error) {
      console.error('Installation check error:', error)
    }
  }

  const validateStep = (currentStep) => {
    switch (currentStep) {
      case 1:
        if (!dbConfig.host || !dbConfig.user || !dbConfig.password) {
          setError({
            isOpen: true,
            title: 'Validation Error',
            message: 'Please fill in all database connection fields.',
            errors: []
          })
          return false
        }
        break
      case 3:
        if (!adminConfig.email || !adminConfig.password) {
          setError({
            isOpen: true,
            title: 'Validation Error',
            message: 'Please fill in all admin account fields.',
            errors: []
          })
          return false
        }
        if (adminConfig.password !== adminConfig.confirmPassword) {
          setError({
            isOpen: true,
            title: 'Validation Error',
            message: 'Passwords do not match.',
            errors: []
          })
          return false
        }
        if (adminConfig.password.length < 8) {
          setError({
            isOpen: true,
            title: 'Validation Error',
            message: 'Password must be at least 8 characters long.',
            errors: []
          })
          return false
        }
        break
      case 4:
        if (smtpConfig.host && (!smtpConfig.user || !smtpConfig.password)) {
          setError({
            isOpen: true,
            title: 'Validation Error',
            message: 'Please provide SMTP username and password when SMTP host is specified.',
            errors: []
          })
          return false
        }
        break
      case 5:
        if (paymentConfig.nowpaymentsEnabled && !paymentConfig.nowpaymentsApiKey) {
          setError({
            isOpen: true,
            title: 'Validation Error',
            message: 'Please provide NowPayments API Key when NowPayments is enabled.',
            errors: []
          })
          return false
        }
        if (paymentConfig.nowpaymentsEnabled && !paymentConfig.nowpaymentsIpnSecret) {
          setError({
            isOpen: true,
            title: 'Validation Error',
            message: 'Please provide NowPayments IPN Secret Key for webhook security.',
            errors: []
          })
          return false
        }
        if (paymentConfig.nowpaymentsEnabled && !paymentConfig.payoutWalletAddress) {
          setError({
            isOpen: true,
            title: 'Validation Error',
            message: 'Please provide payout wallet address to receive payments.',
            errors: []
          })
          return false
        }
        if (paymentConfig.nowpaymentsEnabled && !paymentConfig.payoutWalletCurrency) {
          setError({
            isOpen: true,
            title: 'Validation Error',
            message: 'Please provide payout wallet currency.',
            errors: []
          })
          return false
        }
        if (paymentConfig.nowpaymentsEnabled && !paymentConfig.defaultCurrency) {
          setError({
            isOpen: true,
            title: 'Validation Error',
            message: 'Please provide default currency when NowPayments is enabled.',
            errors: []
          })
          return false
        }
        if (paymentConfig.nowpaymentsEnabled && !paymentConfig.defaultPrice) {
          setError({
            isOpen: true,
            title: 'Validation Error',
            message: 'Please provide default price when NowPayments is enabled.',
            errors: []
          })
          return false
        }
        break
    }
    return true
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const testConnection = async () => {
    if (!validateStep(1)) return

    setLoading(true)
    setError({ isOpen: false, title: '', message: '', errors: [] })
    setSuccess({ isOpen: false, message: '' })

    try {
      const response = await axios.post('/api/installer/test-connection', dbConfig)
      if (response.data.success) {
        setSuccess({ isOpen: true, message: 'Database connection successful!' })
        nextStep()
      } else {
        throw new Error(response.data.message || 'Connection test failed')
      }
    } catch (error) {
      setError({
        isOpen: true,
        title: 'Connection Failed',
        message: error.response?.data?.message || 'Connection failed. Please check your credentials.',
        errors: []
      })
    } finally {
      setLoading(false)
    }
  }

  const createDatabase = async () => {
    setLoading(true)
    setError({ isOpen: false, title: '', message: '', errors: [] })
    setSuccess({ isOpen: false, message: '' })

    try {
      const response = await axios.post('/api/installer/create-database', dbConfig)
      if (response.data.success) {
        setSuccess({ isOpen: true, message: 'Database created successfully!' })
        nextStep()
      } else {
        throw new Error(response.data.message || 'Database creation failed')
      }
    } catch (error) {
      setError({
        isOpen: true,
        title: 'Database Creation Failed',
        message: error.response?.data?.message || 'Failed to create database.',
        errors: []
      })
    } finally {
      setLoading(false)
    }
  }

  const testSmtpConnection = async () => {
    if (!validateStep(4)) return

    if (!smtpConfig.host) {
      nextStep()
      return
    }

    setLoading(true)
    setError({ isOpen: false, title: '', message: '', errors: [] })
    setSuccess({ isOpen: false, message: '' })

    try {
      const response = await axios.post('/api/installer/test-smtp', smtpConfig)
      if (response.data.success) {
        setSuccess({ isOpen: true, message: 'SMTP connection successful!' })
        nextStep()
      } else {
        throw new Error(response.data.message || 'SMTP test failed')
      }
    } catch (error) {
      setError({
        isOpen: true,
        title: 'SMTP Test Failed',
        message: error.response?.data?.message || 'SMTP connection failed. Please check your settings.',
        errors: []
      })
    } finally {
      setLoading(false)
    }
  }

  const completeInstallation = async () => {
    if (!validateStep(5)) return

    setLoading(true)
    setError({ isOpen: false, title: '', message: '', errors: [] })
    setSuccess({ isOpen: false, message: '' })

    try {
      const response = await axios.post('/api/installer/install', {
        dbConfig,
        adminConfig,
        smtpConfig,
        paymentConfig
      })

      if (response.data.success) {
        setSuccess({ isOpen: true, message: 'Installation completed successfully! Redirecting...' })
        setStep(6)
        setTimeout(() => {
          window.location.href = '/login'
        }, 3000)
      } else {
        throw new Error(response.data.message || 'Installation failed')
      }
    } catch (error) {
      setError({
        isOpen: true,
        title: 'Installation Failed',
        message: error.response?.data?.message || 'Installation failed. Please check the error details.',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (installed) {
      window.location.href = '/login'
    }
  }, [installed])

  if (installed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <i className="bi bi-check-circle-fill text-green-600 text-3xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono mb-2">SwiftNexus Enterprise</h1>
          <p className="text-gray-600 font-mono mb-4">Database Already Installed</p>
          <p className="text-sm text-gray-500 font-mono">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-full mb-4">
              <i className="bi bi-tools text-white text-3xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">
              SwiftNexus Enterprise
              <span className="ml-2 text-xs px-2 py-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full font-semibold">
                INSTALLER
              </span>
            </h1>
            <p className="text-gray-600 font-mono">Database Installation Wizard</p>
          </div>

          <div className="flex justify-between mb-8">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div key={s} className="flex-1">
                <div className={`flex items-center ${s < 6 ? 'flex-1' : ''}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-mono font-semibold ${
                    step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {s}
                  </div>
                  {s < 6 && (
                    <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-600 font-mono text-center">
                  {s === 1 && 'Database'}
                  {s === 2 && 'Create DB'}
                  {s === 3 && 'Admin'}
                  {s === 4 && 'SMTP'}
                  {s === 5 && 'Payment'}
                  {s === 6 && 'Complete'}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 font-mono">Step 1: Database Connection</h2>
                <p className="text-gray-600 mb-6 font-mono">Enter your PostgreSQL database credentials:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Database Host</label>
                    <input
                      type="text"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                      placeholder="localhost"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Port</label>
                    <input
                      type="text"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                      placeholder="5432"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Database Name</label>
                    <input
                      type="text"
                      value={dbConfig.database}
                      onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                      placeholder="Enter database name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Username</label>
                    <input
                      type="text"
                      value={dbConfig.user}
                      onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                      placeholder="Enter PostgreSQL username"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Password</label>
                    <input
                      type="password"
                      value={dbConfig.password}
                      onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                      placeholder="Enter PostgreSQL password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    className="btn btn-primary"
                    onClick={testConnection}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-database-check"></i>
                        Test Connection
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 font-mono">Step 2: Create Database</h2>
                <p className="text-gray-600 mb-6 font-mono">Create the database if it doesn't exist:</p>
                
                <div className="flex gap-4">
                  <button className="btn btn-primary" onClick={createDatabase} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-database-add"></i>
                        Create Database
                      </>
                    )}
                  </button>
                  <button className="btn btn-secondary" onClick={prevStep} disabled={loading}>
                    <i className="bi bi-arrow-left"></i>
                    Back
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 font-mono">Step 3: Create Administrator Account</h2>
                <p className="text-gray-600 mb-6 font-mono">Set up your administrator account:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Admin Name</label>
                    <input
                      type="text"
                      value={adminConfig.name}
                      onChange={(e) => setAdminConfig({ ...adminConfig, name: e.target.value })}
                      placeholder="Enter admin name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Admin Email</label>
                    <input
                      type="email"
                      value={adminConfig.email}
                      onChange={(e) => setAdminConfig({ ...adminConfig, email: e.target.value })}
                      placeholder="admin@example.com"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Password</label>
                    <input
                      type="password"
                      value={adminConfig.password}
                      onChange={(e) => setAdminConfig({ ...adminConfig, password: e.target.value })}
                      placeholder="Enter strong password (minimum 8 characters)"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Confirm Password</label>
                    <input
                      type="password"
                      value={adminConfig.confirmPassword}
                      onChange={(e) => setAdminConfig({ ...adminConfig, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button className="btn btn-secondary" onClick={prevStep} disabled={loading}>
                    <i className="bi bi-arrow-left"></i>
                    Back
                  </button>
                  <button className="btn btn-primary" onClick={nextStep} disabled={loading}>
                    <i className="bi bi-arrow-right"></i>
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 font-mono">Step 4: SMTP Settings</h2>
                <p className="text-gray-600 mb-6 font-mono">Configure email settings (optional - can be configured later):</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">SMTP Host</label>
                    <input
                      type="text"
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Port</label>
                    <input
                      type="text"
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                      placeholder="587"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">SMTP Username</label>
                    <input
                      type="text"
                      value={smtpConfig.user}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                      placeholder="your-email@gmail.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">SMTP Password</label>
                    <input
                      type="password"
                      value={smtpConfig.password}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                      placeholder="SMTP password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">From Email</label>
                    <input
                      type="email"
                      value={smtpConfig.fromEmail}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                      placeholder="noreply@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">From Name</label>
                    <input
                      type="text"
                      value={smtpConfig.fromName}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                      placeholder="Your Company Name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={smtpConfig.secure}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })}
                        className="mr-2"
                        disabled={loading}
                      />
                      <span className="text-sm font-medium text-gray-700 font-mono">Use SSL/TLS</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button className="btn btn-secondary" onClick={prevStep} disabled={loading}>
                    <i className="bi bi-arrow-left"></i>
                    Back
                  </button>
                  <button className="btn btn-primary" onClick={testSmtpConnection} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-envelope-check"></i>
                        Test & Continue
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 font-mono">Step 5: Payment Settings</h2>
                <p className="text-gray-600 mb-6 font-mono">Configure NowPayments crypto payment gateway (optional - can be configured later):</p>

                <div className="space-y-6">
                  {/* NowPayments Settings */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        checked={paymentConfig.nowpaymentsEnabled}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, nowpaymentsEnabled: e.target.checked })}
                        className="mr-2"
                        disabled={loading}
                      />
                      <h3 className="text-lg font-semibold text-gray-900 font-mono">NowPayments</h3>
                    </div>
                    
                    {paymentConfig.nowpaymentsEnabled && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">API Key</label>
                            <input
                              type="text"
                              value={paymentConfig.nowpaymentsApiKey}
                              onChange={(e) => setPaymentConfig({ ...paymentConfig, nowpaymentsApiKey: e.target.value })}
                              placeholder="Enter your NowPayments API Key"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                              disabled={loading}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">IPN Secret Key</label>
                            <input
                              type="password"
                              value={paymentConfig.nowpaymentsIpnSecret}
                              onChange={(e) => setPaymentConfig({ ...paymentConfig, nowpaymentsIpnSecret: e.target.value })}
                              placeholder="Enter your NowPayments IPN Secret Key (shown only once during creation)"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                              disabled={loading}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Payout Wallet Address</label>
                            <input
                              type="text"
                              value={paymentConfig.payoutWalletAddress}
                              onChange={(e) => setPaymentConfig({ ...paymentConfig, payoutWalletAddress: e.target.value })}
                              placeholder="Enter your wallet address to receive payments"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                              disabled={loading}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Payout Wallet Currency</label>
                            <select
                              value={paymentConfig.payoutWalletCurrency}
                              onChange={(e) => setPaymentConfig({ ...paymentConfig, payoutWalletCurrency: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                              disabled={loading}
                            >
                              <option value="">Select Payout Currency</option>
                              <option value="BTC">Bitcoin (BTC)</option>
                              <option value="ETH">Ethereum (ETH)</option>
                              <option value="USDT">Tether (USDT)</option>
                              <option value="USDC">USD Coin (USDC)</option>
                              <option value="LTC">Litecoin (LTC)</option>
                              <option value="BCH">Bitcoin Cash (BCH)</option>
                              <option value="TRX">TRON (TRX)</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800 font-mono mb-2">
                            <strong>Important Notes:</strong>
                          </p>
                          <ul className="text-sm text-blue-800 font-mono list-disc list-inside space-y-1">
                            <li>Get API Key and IPN Secret from your NowPayments dashboard</li>
                            <li>IPN Secret is shown only once during creation - save it immediately</li>
                            <li>Specify your payout wallet address in NowPayments dashboard first</li>
                            <li>IPN Secret is required for secure webhook validation (HMAC SHA-512)</li>
                            <li>Payments will be converted and sent to your payout wallet</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* General Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Default Currency</label>
                      <select
                        value={paymentConfig.defaultCurrency}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, defaultCurrency: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        disabled={loading}
                      >
                        <option value="">Select Currency</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                        <option value="USDT">USDT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">Default Price</label>
                      <input
                        type="text"
                        value={paymentConfig.defaultPrice}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, defaultPrice: e.target.value })}
                        placeholder="Enter default price"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button className="btn btn-secondary" onClick={prevStep} disabled={loading}>
                    <i className="bi bi-arrow-left"></i>
                    Back
                  </button>
                  <button className="btn btn-primary" onClick={nextStep} disabled={loading}>
                    <i className="bi bi-arrow-right"></i>
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <i className="bi bi-check-circle-fill text-green-600 text-3xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 font-mono">Installation Complete!</h2>
                <p className="text-gray-600 mb-2 font-mono">Your SwiftNexus Enterprise has been installed successfully.</p>
                <p className="text-gray-600 mb-6 font-mono">You can now proceed to the login page.</p>
                <button 
                  className="btn btn-primary" 
                  onClick={completeInstallation}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Installing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-download"></i>
                      Complete Installation
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ErrorModal
        isOpen={error.isOpen}
        onClose={() => setError({ isOpen: false, title: '', message: '', errors: [] })}
        title={error.title}
        message={error.message}
        errors={error.errors}
        type="error"
      />
      <SuccessModal
        isOpen={success.isOpen}
        onClose={() => setSuccess({ isOpen: false, message: '' })}
        message={success.message}
      />
    </>
  )
}

export default Installer
