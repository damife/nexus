import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileText,
  RefreshCw,
  Eye,
  Download,
  Upload,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Users,
  Activity
} from 'lucide-react'
import api from '../../utils/api'

const SwiftMessaging = () => {
  const [activeTab, setActiveTab] = useState('generate')
  const [messageTypes, setMessageTypes] = useState({ mt: {}, mx: {} })
  const [categories, setCategories] = useState({})
  const [selectedMessageType, setSelectedMessageType] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [messageData, setMessageData] = useState({})
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [validation, setValidation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [messageHistory, setMessageHistory] = useState([])
  const [correspondentBanks, setCorrespondentBanks] = useState([])
  const [selectedCorrespondent, setSelectedCorrespondent] = useState('')
  const [messageDetails, setMessageDetails] = useState(null)
  const [userStats, setUserStats] = useState({
    totalMessages: 0,
    sentMessages: 0,
    pendingMessages: 0,
    failedMessages: 0
  })

  useEffect(() => {
    fetchMessageTypes()
    fetchCategories()
    fetchCorrespondentBanks()
    fetchMessageHistory()
    fetchUserStats()
  }, [])

  const fetchMessageTypes = async () => {
    try {
      const response = await api.get('/api/swift-complete/messagetypes')
      setMessageTypes(response.data.data)
    } catch (error) {
      setError('Failed to fetch message types')
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/swift-complete/categories')
      setCategories(response.data.data)
    } catch (error) {
      setError('Failed to fetch categories')
    }
  }

  const fetchCorrespondentBanks = async () => {
    try {
      const response = await api.get('/api/user/correspondent-banks')
      setCorrespondentBanks(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch correspondent banks:', error)
    }
  }

  const fetchMessageHistory = async () => {
    try {
      // This would be implemented to fetch user's message history
      // For now, we'll use mock data
      setMessageHistory([
        {
          id: 1,
          messageType: 'MT103',
          reference: 'TXN20240129001',
          status: 'sent',
          timestamp: '2024-01-29T10:30:00Z',
          correspondent: 'SCBLDEFXXXX',
          amount: '1000.00',
          currency: 'USD'
        },
        {
          id: 2,
          messageType: 'MT199',
          reference: 'MSG20240129002',
          status: 'pending',
          timestamp: '2024-01-29T11:15:00Z',
          correspondent: 'SBININBBXXX',
          amount: null,
          currency: null
        },
        {
          id: 3,
          messageType: 'MT202',
          reference: 'TXN20240129003',
          status: 'sent',
          timestamp: '2024-01-29T09:45:00Z',
          correspondent: 'CITIUS33XXX',
          amount: '5000.00',
          currency: 'EUR'
        }
      ])
    } catch (error) {
      console.error('Failed to fetch message history:', error)
    }
  }

  const fetchUserStats = async () => {
    try {
      // This would be implemented to fetch user's statistics
      // For now, we'll use mock data
      setUserStats({
        totalMessages: 156,
        sentMessages: 142,
        pendingMessages: 8,
        failedMessages: 6
      })
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  const handleMessageTypeChange = (type) => {
    setSelectedMessageType(type)
    setMessageData({})
    setGeneratedMessage('')
    setValidation(null)
    fetchMessageDetails(type)
  }

  const fetchMessageDetails = async (messageType) => {
    try {
      const response = await api.get(`/api/swift-complete/details/${messageType}`)
      setMessageDetails(response.data.data)
    } catch (error) {
      console.error('Failed to fetch message details:', error)
    }
  }

  const handleFieldChange = (field, value) => {
    setMessageData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateMessage = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    setGeneratedMessage('')
    setValidation(null)

    try {
      let response
      if (selectedMessageType.startsWith('MT')) {
        response = await api.post(`/api/swift-complete/generate/${selectedMessageType}`, {
          ...messageData,
          senderBIC: messageData.senderBIC || selectedCorrespondent || 'SCBLDEFXXXX',
          receiverBIC: messageData.receiverBIC || 'SBININBBXXX'
        })
      } else {
        response = await api.post(`/api/swift-complete/generate/mx/${selectedMessageType}`, messageData)
      }

      setGeneratedMessage(response.data.data.swiftMessage || response.data.data.mxMessage)
      setValidation(response.data.data.validation)
      setSuccess('Message generated successfully!')
      
      // Add to history
      setMessageHistory(prev => [{
        id: Date.now(),
        messageType: selectedMessageType,
        reference: messageData.transactionReference || 'REF' + Date.now(),
        status: 'generated',
        timestamp: new Date().toISOString(),
        correspondent: messageData.receiverBIC || 'SBININBBXXX',
        amount: messageData.amount,
        currency: messageData.currency
      }, ...prev.slice(0, 9)])
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to generate message')
    } finally {
      setLoading(false)
    }
  }

  const validateMessage = async () => {
    if (!generatedMessage) {
      setError('No message to validate')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/api/swift-complete/validate', {
        swiftMessage: generatedMessage
      })
      setValidation(response.data.data.validation)
      setSuccess('Message validated successfully!')
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to validate message')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!generatedMessage) {
      setError('No message to send')
      return
    }

    setLoading(true)
    try {
      // This would be implemented to actually send the message
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 2000))
      setSuccess('Message sent successfully!')
      
      // Update history
      setMessageHistory(prev => prev.map(msg => 
        msg.reference === (messageData.transactionReference || 'REF' + Date.now())
          ? { ...msg, status: 'sent' }
          : msg
      ))

      // Update stats
      setUserStats(prev => ({
        ...prev,
        sentMessages: prev.sentMessages + 1,
        pendingMessages: prev.pendingMessages - 1
      }))
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      sent: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      pending: { variant: 'secondary', icon: Clock, color: 'text-yellow-600' },
      failed: { variant: 'destructive', icon: AlertCircle, color: 'text-red-600' },
      generated: { variant: 'outline', icon: FileText, color: 'text-blue-600' }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const renderStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold">{userStats.totalMessages}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-green-600">{userStats.sentMessages}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{userStats.pendingMessages}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{userStats.failedMessages}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderMessageForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categories.categoryDescriptions || {}).map(([key, description]) => (
                <SelectItem key={key} value={key}>
                  Category {key}: {description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="messageType">Message Type</Label>
          <Select value={selectedMessageType} onValueChange={handleMessageTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select message type" />
            </SelectTrigger>
            <SelectContent>
              <div className="max-h-60 overflow-y-auto">
                {Object.entries(messageTypes.mt || {}).map(([type, description]) => (
                  <SelectItem key={type} value={type}>
                    {type}: {description}
                  </SelectItem>
                ))}
                {Object.entries(messageTypes.mx || {}).map(([type, description]) => (
                  <SelectItem key={type} value={type}>
                    {type}: {description}
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCorrespondent && (
        <div>
          <Label htmlFor="correspondent">Correspondent Bank</Label>
          <Select value={selectedCorrespondent} onValueChange={setSelectedCorrespondent}>
            <SelectTrigger>
              <SelectValue placeholder="Select correspondent bank" />
            </SelectTrigger>
            <SelectContent>
              {correspondentBanks.map(bank => (
                <SelectItem key={bank.id} value={bank.bicCode}>
                  {bank.bankName} ({bank.bicCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {messageDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Message Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Type:</strong> {messageDetails.messageType}</p>
              <p><strong>Description:</strong> {messageDetails.description}</p>
              <p><strong>Category:</strong> {messageDetails.category}</p>
              <div>
                <strong>Required Fields:</strong>
                <div className="flex flex-wrap gap-2 mt-1">
                  {messageDetails.requiredFields.map(field => (
                    <Badge key={field} variant="outline">{field}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="senderBIC">Sender BIC</Label>
          <Input
            id="senderBIC"
            value={messageData.senderBIC || ''}
            onChange={(e) => handleFieldChange('senderBIC', e.target.value)}
            placeholder="SCBLDEFXXXX"
          />
        </div>

        <div>
          <Label htmlFor="receiverBIC">Receiver BIC</Label>
          <Input
            id="receiverBIC"
            value={messageData.receiverBIC || ''}
            onChange={(e) => handleFieldChange('receiverBIC', e.target.value)}
            placeholder="SBININBBXXX"
          />
        </div>

        <div>
          <Label htmlFor="transactionReference">Transaction Reference</Label>
          <Input
            id="transactionReference"
            value={messageData.transactionReference || ''}
            onChange={(e) => handleFieldChange('transactionReference', e.target.value)}
            placeholder="TXN20240129001"
          />
        </div>

        {(selectedMessageType === 'MT103' || selectedMessageType === 'MT202') && (
          <>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={messageData.currency || ''}
                onChange={(e) => handleFieldChange('currency', e.target.value)}
                placeholder="USD"
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                value={messageData.amount || ''}
                onChange={(e) => handleFieldChange('amount', e.target.value)}
                placeholder="1000.00"
              />
            </div>
          </>
        )}

        {(selectedMessageType === 'MT199' || selectedMessageType === 'MT799') && (
          <div className="md:col-span-2">
            <Label htmlFor="messageContent">Message Content</Label>
            <Textarea
              id="messageContent"
              value={messageData.messageContent || ''}
              onChange={(e) => handleFieldChange('messageContent', e.target.value)}
              placeholder="Enter your message content here..."
              rows={4}
            />
          </div>
        )}

        {selectedMessageType === 'MT103' && (
          <>
            <div>
              <Label htmlFor="orderingCustomer">Ordering Customer</Label>
              <Input
                id="orderingCustomer"
                value={messageData.orderingCustomer || ''}
                onChange={(e) => handleFieldChange('orderingCustomer', e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="beneficiaryCustomer">Beneficiary Customer</Label>
              <Input
                id="beneficiaryCustomer"
                value={messageData.beneficiaryCustomer || ''}
                onChange={(e) => handleFieldChange('beneficiaryCustomer', e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={generateMessage} disabled={loading || !selectedMessageType}>
          <Send className="w-4 h-4 mr-2" />
          Generate Message
        </Button>
        
        {generatedMessage && (
          <>
            <Button onClick={validateMessage} variant="outline" disabled={loading}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Validate
            </Button>
            
            <Button onClick={sendMessage} variant="default" disabled={loading}>
              <Upload className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </>
        )}
      </div>
    </div>
  )

  const renderGeneratedMessage = () => (
    <div className="space-y-4">
      {generatedMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Generated SWIFT Message
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                {generatedMessage}
              </pre>
            </div>
            
            {validation && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Validation Result</h4>
                {validation.isValid ? (
                  <Alert>
                    <CheckCircle className="w-4 h-4" />
                    <AlertDescription>
                      Message is valid and ready to send.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Message validation failed: {validation.errors.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderMessageHistory = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Message History
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {messageHistory.map(message => (
              <div key={message.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{message.messageType}</p>
                    <p className="text-sm text-gray-600">{message.reference}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleString()}
                    </p>
                    {message.amount && (
                      <p className="text-sm font-medium text-green-600">
                        {message.currency} {message.amount}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{message.correspondent}</span>
                  {getStatusBadge(message.status)}
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SWIFT Messaging</h1>
          <p className="text-gray-600">Generate, validate, and send SWIFT messages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {renderStatsCards()}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {renderMessageForm()}
          {generatedMessage && renderGeneratedMessage()}
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {renderGeneratedMessage()}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {renderMessageHistory()}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Message templates will be available soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SwiftMessaging
