import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { 
  Activity, 
  Database, 
  Server, 
  Globe, 
  Shield, 
  Users, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  HardDrive,
  Cpu,
  Zap
} from 'lucide-react'
import api from '../../utils/api'

const SystemHealth = () => {
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchHealthData()
    
    let interval
    if (autoRefresh) {
      interval = setInterval(fetchHealthData, 30000) // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchHealthData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await api.get('/api/health/detailed')
      setHealthData(response.data.data)
      setLastUpdate(new Date())
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to fetch health data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Activity className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      healthy: 'default',
      warning: 'secondary',
      unhealthy: 'destructive'
    }
    
    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status || 'unknown'}
      </Badge>
    )
  }

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatBytes = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error && !healthData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!healthData) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-gray-600">Monitor system performance and service status</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-blue-50' : ''}
          >
            <Activity className="w-4 h-4 mr-2" />
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button onClick={fetchHealthData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {lastUpdate && (
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Overall System Status
            </span>
            {getStatusBadge(healthData.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Environment</p>
              <p className="font-semibold">{healthData.environment}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Version</p>
              <p className="font-semibold">{healthData.version}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="font-semibold">{formatUptime(healthData.uptime)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Last Check</p>
              <p className="font-semibold">{new Date(healthData.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Database Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database
              </span>
              {getStatusBadge(healthData.services.database.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Response Time</span>
                <span className="text-sm font-medium">{healthData.services.database.responseTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Query Time</span>
                <span className="text-sm font-medium">{healthData.services.database.queryTime}</span>
              </div>
              {healthData.services.database.connectionPool && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active Connections</span>
                    <span className="text-sm font-medium">{healthData.services.database.connectionPool.activeConnections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Connections</span>
                    <span className="text-sm font-medium">{healthData.services.database.connectionPool.totalConnections}</span>
                  </div>
                </>
              )}
              {healthData.services.database.error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{healthData.services.database.error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                System Resources
              </span>
              {getStatusBadge(healthData.services.system.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Memory Usage</span>
                <span className="text-sm font-medium">{healthData.services.system.memory.systemUsage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">CPU Load</span>
                <span className="text-sm font-medium">{healthData.services.system.cpu.loadAverage[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Disk Space</span>
                <span className="text-sm font-medium">{healthData.services.system.disk.freePercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="text-sm font-medium">{healthData.services.system.uptime}</span>
              </div>
              {healthData.services.system.issues && healthData.services.system.issues.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{healthData.services.system.issues.join(', ')}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* API Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                API Services
              </span>
              {getStatusBadge(healthData.services.api.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthData.services.api.endpoints.map((endpoint, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 truncate">{endpoint.endpoint}</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(endpoint.status)}
                    <span className="text-xs">{endpoint.responseTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SWIFT Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                SWIFT Services
              </span>
              {getStatusBadge(healthData.services.swift.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthData.services.swift.services.map((service, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{service.service}</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(service.status)}
                    {service.messageTypes && (
                      <span className="text-xs text-gray-500">{service.messageTypes} types</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tenant Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Tenant Services
              </span>
              {getStatusBadge(healthData.services.tenant.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Tenants</span>
                <span className="text-sm font-medium">{healthData.services.tenant.metrics.activeTenants}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="text-sm font-medium">{healthData.services.tenant.metrics.activeUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Messages (24h)</span>
                <span className="text-sm font-medium">{healthData.services.tenant.metrics.messages24h}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tenant Isolation</span>
                <span className="text-sm font-medium">{healthData.services.tenant.metrics.tenantIsolation}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Status
              </span>
              {getStatusBadge('healthy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Authentication</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Rate Limiting</span>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Input Validation</span>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">HTTPS</span>
                <Badge variant="default">Enabled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Memory Usage
                </span>
                <span className="text-sm text-gray-600">
                  {healthData.services.system.memory.used} / {healthData.services.system.memory.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${healthData.services.system.memory.systemUsage}%` }}
                />
              </div>
            </div>

            {/* CPU Load */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  CPU Load
                </span>
                <span className="text-sm text-gray-600">
                  {healthData.services.system.cpu.loadAverage[0]} / {healthData.services.system.cpu.cores} cores
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((healthData.services.system.cpu.loadAverage[0] / healthData.services.system.cpu.cores) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Disk Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Disk Usage
                </span>
                <span className="text-sm text-gray-600">
                  {healthData.services.system.disk.free} free
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full" 
                  style={{ width: `${100 - healthData.services.system.disk.freePercent}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SystemHealth
