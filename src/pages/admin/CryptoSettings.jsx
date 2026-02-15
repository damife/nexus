import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'
import { Card, Button, Input, Badge } from '../../components/UIComponents'

const CryptoSettings = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  
  const [cryptoSettings, setCryptoSettings] = useState({
    // NowPayments Settings
    nowpaymentsApiKey: '',
    nowpaymentsIpnSecret: '',
    nowpaymentsBaseUrl: 'https://api.nowpayments.io/v1',
    
    // Fee Settings
    bitcoinFee: 0.001, // BTC
    ethereumFee: 0.01, // ETH
    usdtFee: 1.0, // USDT
    
    // Deposit Settings
    minimumDeposit: 10.0, // USD
    maximumDeposit: 10000.0, // USD
    autoConfirmDeposits: true,
    confirmationsRequired: 3,
    
    // Wallet Settings
    bitcoinWalletAddress: '',
    ethereumWalletAddress: '',
    
    // Exchange Rate Settings
    exchangeRateProvider: 'nowpayments', // 'nowpayments', 'coingecko', 'custom'
    customExchangeRateApi: '',
    exchangeRateMarkup: 2.5, // percentage
    
    // Notification Settings
    depositNotifications: true,
    withdrawalNotifications: true,
    adminEmailNotifications: true
  })

  const [testResult, setTestResult] = useState(null)
  const [exchangeRates, setExchangeRates] = useState({})

  useEffect(() => {
    fetchCryptoSettings()
    fetchExchangeRates()
  }, [])

  const fetchCryptoSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/settings/crypto')
      setCryptoSettings(response.data.settings || {})
    } catch (error) {
      console.error('Error fetching crypto settings:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Crypto Settings',
        message: error.response?.data?.message || 'Failed to load crypto settings',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchExchangeRates = async () => {
    try {
      const response = await api.get('/admin/crypto/exchange-rates')
      setExchangeRates(response.data.rates || {})
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
    }
  }

  const saveCryptoSettings = async () => {
    try {
      setLoading(true)
      await api.post('/admin/settings/crypto', cryptoSettings)
      
      setSuccessModal({
        isOpen: true,
        message: 'Crypto settings saved successfully!'
      })
    } catch (error) {
      console.error('Error saving crypto settings:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Saving Crypto Settings',
        message: error.response?.data?.message || 'Failed to save crypto settings',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const testNowPaymentsConnection = async () => {
    try {
      setLoading(true)
      const response = await api.post('/admin/crypto/test-nowpayments', {
        apiKey: cryptoSettings.nowpaymentsApiKey,
        baseUrl: cryptoSettings.nowpaymentsBaseUrl
      })
      
      setTestResult({
        success: true,
        message: 'NowPayments connection successful!',
        data: response.data
      })
    } catch (error) {
      console.error('Error testing NowPayments connection:', error)
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Failed to connect to NowPayments'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setCryptoSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getStatusColor = (configured) => {
    return configured ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'
  }

  const isNowPaymentsConfigured = cryptoSettings.nowpaymentsApiKey && cryptoSettings.nowpaymentsIpnSecret

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Crypto Settings</h1>
            <p className="text-gray-600 font-mono">Configure cryptocurrency payment processing</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={fetchExchangeRates} disabled={loading}>
              <i className="bi bi-arrow-clockwise mr-2"></i>
              Refresh Rates
            </Button>
            <Button onClick={saveCryptoSettings} disabled={loading}>
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

        {/* Current Exchange Rates */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="bi bi-currency-exchange text-blue-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 font-mono">Current Exchange Rates</h3>
                <p className="text-sm text-gray-600 font-mono">Live cryptocurrency exchange rates</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 font-mono">BTC/USD</span>
                  <Badge variant="info" size="sm">Bitcoin</Badge>
                </div>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  ${exchangeRates.btc?.toFixed(2) || 'Loading...'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 font-mono">ETH/USD</span>
                  <Badge variant="info" size="sm">Ethereum</Badge>
                </div>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  ${exchangeRates.eth?.toFixed(2) || 'Loading...'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 font-mono">USDT/USD</span>
                  <Badge variant="info" size="sm">Tether</Badge>
                </div>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  ${exchangeRates.usdt?.toFixed(2) || '1.00'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* NowPayments Configuration */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="bi bi-coin text-orange-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 font-mono">NowPayments Configuration</h3>
                <p className="text-sm text-gray-600 font-mono">Configure NowPayments API for crypto processing</p>
              </div>
              <Badge variant={isNowPaymentsConfigured ? 'success' : 'secondary'}>
                {isNowPaymentsConfigured ? 'Configured' : 'Not Configured'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="NowPayments API Key"
                  type="password"
                  value={cryptoSettings.nowpaymentsApiKey}
                  onChange={(e) => handleInputChange('nowpaymentsApiKey', e.target.value)}
                  placeholder="Your NowPayments API key"
                  helper="Get this from your NowPayments dashboard"
                />
              </div>
              <div>
                <Input
                  label="IPN Secret"
                  type="password"
                  value={cryptoSettings.nowpaymentsIpnSecret}
                  onChange={(e) => handleInputChange('nowpaymentsIpnSecret', e.target.value)}
                  placeholder="Your IPN secret key"
                  helper="Used for webhook verification"
                />
              </div>
              <div>
                <Input
                  label="Base URL"
                  value={cryptoSettings.nowpaymentsBaseUrl}
                  onChange={(e) => handleInputChange('nowpaymentsBaseUrl', e.target.value)}
                  placeholder="https://api.nowpayments.io/v1"
                  helper="NowPayments API base URL"
                />
              </div>
            </div>

            <div className="mt-6">
              <Button 
                onClick={testNowPaymentsConnection}
                disabled={loading || !cryptoSettings.nowpaymentsApiKey}
                variant="secondary"
              >
                {loading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-link-45deg mr-2"></i>
                    Test Connection
                  </>
                )}
              </Button>
            </div>

            {testResult && (
              <div className={`mt-4 p-4 rounded-lg border ${
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
                    {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </span>
                </div>
                <p className={`mt-1 text-sm font-mono ${
                  testResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResult.message}
                </p>
              </div>
            )}

            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-medium text-orange-900 font-mono mb-2">NowPayments Setup Instructions:</h4>
              <ol className="text-sm text-orange-800 font-mono space-y-1">
                <li>1. Sign up at <a href="https://nowpayments.io" target="_blank" rel="noopener noreferrer" className="underline">nowpayments.io</a></li>
                <li>2. Create a new API key in your dashboard</li>
                <li>3. Set up IPN (Instant Payment Notification) URL</li>
                <li>4. Configure your payment methods (BTC, ETH, USDT)</li>
                <li>5. Copy API key and IPN secret to the fields above</li>
              </ol>
            </div>
          </div>
        </Card>

        {/* Fee Configuration */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="bi bi-percent text-green-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 font-mono">Fee Configuration</h3>
                <p className="text-sm text-gray-600 font-mono">Set transaction fees for each cryptocurrency</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Input
                  label="Bitcoin Fee (BTC)"
                  type="number"
                  step="0.0001"
                  value={cryptoSettings.bitcoinFee}
                  onChange={(e) => handleInputChange('bitcoinFee', e.target.value)}
                  placeholder="0.001"
                  helper="Fee charged for Bitcoin transactions"
                />
              </div>
              <div>
                <Input
                  label="Ethereum Fee (ETH)"
                  type="number"
                  step="0.001"
                  value={cryptoSettings.ethereumFee}
                  onChange={(e) => handleInputChange('ethereumFee', e.target.value)}
                  placeholder="0.01"
                  helper="Fee charged for Ethereum transactions"
                />
              </div>
              <div>
                <Input
                  label="USDT Fee (USDT)"
                  type="number"
                  step="0.1"
                  value={cryptoSettings.usdtFee}
                  onChange={(e) => handleInputChange('usdtFee', e.target.value)}
                  placeholder="1.0"
                  helper="Fee charged for USDT transactions"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Deposit Settings */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="bi bi-arrow-down-circle text-blue-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 font-mono">Deposit Settings</h3>
                <p className="text-sm text-gray-600 font-mono">Configure deposit limits and confirmation settings</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Minimum Deposit (USD)"
                  type="number"
                  step="0.01"
                  value={cryptoSettings.minimumDeposit}
                  onChange={(e) => handleInputChange('minimumDeposit', e.target.value)}
                  placeholder="10.00"
                  helper="Minimum deposit amount in USD"
                />
              </div>
              <div>
                <Input
                  label="Maximum Deposit (USD)"
                  type="number"
                  step="0.01"
                  value={cryptoSettings.maximumDeposit}
                  onChange={(e) => handleInputChange('maximumDeposit', e.target.value)}
                  placeholder="10000.00"
                  helper="Maximum deposit amount in USD"
                />
              </div>
              <div>
                <Input
                  label="Confirmations Required"
                  type="number"
                  value={cryptoSettings.confirmationsRequired}
                  onChange={(e) => handleInputChange('confirmationsRequired', e.target.value)}
                  placeholder="3"
                  helper="Number of blockchain confirmations required"
                />
              </div>
              <div>
                <Input
                  label="Exchange Rate Markup (%)"
                  type="number"
                  step="0.1"
                  value={cryptoSettings.exchangeRateMarkup}
                  onChange={(e) => handleInputChange('exchangeRateMarkup', e.target.value)}
                  placeholder="2.5"
                  helper="Percentage markup on exchange rates"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cryptoSettings.autoConfirmDeposits}
                  onChange={(e) => handleInputChange('autoConfirmDeposits', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900 font-mono">
                  Auto-confirm deposits after required confirmations
                </span>
              </label>
              <p className="text-xs text-gray-500 font-mono mt-1">
                When enabled, deposits will be automatically credited to user accounts
              </p>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="bi bi-bell text-purple-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 font-mono">Notification Settings</h3>
                <p className="text-sm text-gray-600 font-mono">Configure email notifications for crypto events</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cryptoSettings.depositNotifications}
                  onChange={(e) => handleInputChange('depositNotifications', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900 font-mono">
                  Send email notifications for deposits
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cryptoSettings.withdrawalNotifications}
                  onChange={(e) => handleInputChange('withdrawalNotifications', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900 font-mono">
                  Send email notifications for withdrawals
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cryptoSettings.adminEmailNotifications}
                  onChange={(e) => handleInputChange('adminEmailNotifications', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900 font-mono">
                  Send email notifications to admins for large transactions
                </span>
              </label>
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
                  <strong>NowPayments:</strong> NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET
                </div>
                <div className="bg-white p-2 rounded border border-gray-300">
                  <strong>Bitcoin:</strong> BITCOIN_RPC_URL, BITCOIN_RPC_USER, BITCOIN_RPC_PASSWORD
                </div>
                <div className="bg-white p-2 rounded border border-gray-300">
                  <strong>Ethereum:</strong> ETHEREUM_RPC_URL, ETHEREUM_PRIVATE_KEY, ETHEREUM_WALLET_ADDRESS
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

export default CryptoSettings
