import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SystemDashboard = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    loadSystemStatus();
    loadStatistics();

    // Auto-refresh every 10 seconds if enabled
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadSystemStatus();
        loadStatistics();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadSystemStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/system/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemStatus(response.data.status);
      setLoading(false);
    } catch (error) {
      console.error('Error loading system status:', error);
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/system/statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadLogs = async (type = 'combined', lines = 100) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/system/logs?type=${type}&lines=${lines}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLogs(response.data.logs.logs || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusBadge = (status) => {
    const isConnected = status === 'available' || status === true;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
        isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isConnected ? '● Online' : '● Offline'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-mono">Loading system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono">System Dashboard</h1>
            <p className="text-gray-600 font-mono mt-1">
              Monitor system health and performance
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 font-mono">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              Auto-refresh (10s)
            </label>
            <button
              onClick={() => {
                loadSystemStatus();
                loadStatistics();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-mono"
            >
              <i className="bi bi-arrow-clockwise mr-2"></i>
              Refresh
            </button>
          </div>
        </div>

        {/* Overall Health Status */}
        {systemStatus && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-mono mb-2">System Health</h2>
                <p className="text-gray-600 font-mono text-sm">
                  Last updated: {new Date(systemStatus.timestamp).toLocaleString()}
                </p>
              </div>
              <div className={`px-6 py-3 rounded-lg font-bold text-lg font-mono ${getHealthColor(systemStatus.health)}`}>
                {systemStatus.health.toUpperCase()}
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 font-mono text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900 font-mono mt-2">
                    {statistics.users?.total || 0}
                  </p>
                  <p className="text-green-600 font-mono text-sm mt-1">
                    +{statistics.users?.new_today || 0} today
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="bi bi-people text-blue-600 text-2xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 font-mono text-sm">Total Payments</p>
                  <p className="text-3xl font-bold text-gray-900 font-mono mt-2">
                    {statistics.payments?.total || 0}
                  </p>
                  <p className="text-green-600 font-mono text-sm mt-1">
                    {statistics.payments?.today || 0} today
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="bi bi-cash-coin text-green-600 text-2xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 font-mono text-sm">Messages</p>
                  <p className="text-3xl font-bold text-gray-900 font-mono mt-2">
                    {statistics.messages?.total || 0}
                  </p>
                  <p className="text-green-600 font-mono text-sm mt-1">
                    {statistics.messages?.today || 0} today
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="bi bi-envelope text-purple-600 text-2xl"></i>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-4 px-6" aria-label="Tabs">
              {['overview', 'server', 'database', 'services', 'resources', 'logs'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'logs') loadLogs();
                  }}
                  className={`py-4 px-4 border-b-2 font-mono text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && systemStatus && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Server Status */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 font-mono">Server</h3>
                      {getStatusBadge(systemStatus.server.running)}
                    </div>
                    <div className="space-y-2 text-sm font-mono">
                      <p><span className="text-gray-600">Uptime:</span> {systemStatus.server.uptime.formatted}</p>
                      <p><span className="text-gray-600">Node:</span> {systemStatus.server.nodeVersion}</p>
                      <p><span className="text-gray-600">Platform:</span> {systemStatus.server.platform}</p>
                    </div>
                  </div>

                  {/* Database Status */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 font-mono">Database</h3>
                      {getStatusBadge(systemStatus.database.connected)}
                    </div>
                    {systemStatus.database.connected ? (
                      <div className="space-y-2 text-sm font-mono">
                        <p><span className="text-gray-600">Response:</span> {systemStatus.database.responseTime}</p>
                        <p><span className="text-gray-600">Size:</span> {systemStatus.database.size}</p>
                        <p><span className="text-gray-600">Tables:</span> {systemStatus.database.tables}</p>
                        <p><span className="text-gray-600">Connections:</span> {systemStatus.database.activeConnections}</p>
                      </div>
                    ) : (
                      <p className="text-red-600 text-sm font-mono">Connection failed</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Server Tab */}
            {activeTab === 'server' && systemStatus && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 font-mono mb-4">Server Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div className="border-b border-gray-200 pb-2">
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-semibold">{systemStatus.server.running ? 'Running' : 'Stopped'}</span>
                  </div>
                  <div className="border-b border-gray-200 pb-2">
                    <span className="text-gray-600">Uptime:</span>
                    <span className="ml-2 font-semibold">{systemStatus.server.uptime.formatted}</span>
                  </div>
                  <div className="border-b border-gray-200 pb-2">
                    <span className="text-gray-600">Node Version:</span>
                    <span className="ml-2 font-semibold">{systemStatus.server.nodeVersion}</span>
                  </div>
                  <div className="border-b border-gray-200 pb-2">
                    <span className="text-gray-600">Platform:</span>
                    <span className="ml-2 font-semibold">{systemStatus.server.platform}</span>
                  </div>
                  <div className="border-b border-gray-200 pb-2">
                    <span className="text-gray-600">Process ID:</span>
                    <span className="ml-2 font-semibold">{systemStatus.server.pid}</span>
                  </div>
                  <div className="border-b border-gray-200 pb-2">
                    <span className="text-gray-600">Environment:</span>
                    <span className="ml-2 font-semibold">{systemStatus.server.environment}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-bold text-gray-900 font-mono mb-3">Memory Usage</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">RSS:</span>
                      <span className="ml-2 font-semibold">{systemStatus.server.memory.rss}</span>
                    </div>
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Heap Total:</span>
                      <span className="ml-2 font-semibold">{systemStatus.server.memory.heapTotal}</span>
                    </div>
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Heap Used:</span>
                      <span className="ml-2 font-semibold">{systemStatus.server.memory.heapUsed}</span>
                    </div>
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">External:</span>
                      <span className="ml-2 font-semibold">{systemStatus.server.memory.external}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Database Tab */}
            {activeTab === 'database' && systemStatus && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 font-mono mb-4">Database Information</h3>
                {systemStatus.database.connected ? (
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2 font-semibold text-green-600">Connected</span>
                    </div>
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Response Time:</span>
                      <span className="ml-2 font-semibold">{systemStatus.database.responseTime}</span>
                    </div>
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Version:</span>
                      <span className="ml-2 font-semibold">{systemStatus.database.version}</span>
                    </div>
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Database Size:</span>
                      <span className="ml-2 font-semibold">{systemStatus.database.size}</span>
                    </div>
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Host:</span>
                      <span className="ml-2 font-semibold">{systemStatus.database.host}</span>
                    </div>
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Port:</span>
                      <span className="ml-2 font-semibold">{systemStatus.database.port}</span>
                    </div>
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Database:</span>
                      <span className="ml-2 font-semibold">{systemStatus.database.database}</span>
                    </div>
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Active Connections:</span>
                      <span className="ml-2 font-semibold">{systemStatus.database.activeConnections}</span>
                    </div>
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Tables:</span>
                      <span className="ml-2 font-semibold">{systemStatus.database.tables}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 font-mono font-semibold">
                      <i className="bi bi-exclamation-triangle mr-2"></i>
                      Database connection failed
                    </p>
                    <p className="text-sm text-red-600 font-mono mt-2">
                      {systemStatus.database.error}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && systemStatus && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 font-mono mb-4">External Services</h3>
                <div className="space-y-3">
                  {Object.entries(systemStatus.services).map(([name, service]) => (
                    <div key={name} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900 font-mono capitalize">
                            {name.replace(/([A-Z])/g, ' $1').trim()}
                          </h4>
                          <p className="text-sm text-gray-600 font-mono mt-1">
                            Status: {service.status}
                          </p>
                        </div>
                        <div>
                          {service.enabled ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-mono">
                              Enabled
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-mono">
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources Tab */}
            {activeTab === 'resources' && systemStatus && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 font-mono mb-4">System Resources</h3>

                  {/* CPU */}
                  <div className="border border-gray-200 rounded-lg p-4 mb-4">
                    <h4 className="font-bold text-gray-900 font-mono mb-3">CPU</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                      <div>
                        <span className="text-gray-600">Model:</span>
                        <p className="font-semibold mt-1">{systemStatus.resources.cpu.model}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Cores:</span>
                        <p className="font-semibold mt-1">{systemStatus.resources.cpu.cores}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Load Average:</span>
                        <div className="flex gap-2 mt-2">
                          {systemStatus.resources.cpu.loadAverage.map((load, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {load}%
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Memory */}
                  <div className="border border-gray-200 rounded-lg p-4 mb-4">
                    <h4 className="font-bold text-gray-900 font-mono mb-3">Memory</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <p className="font-semibold mt-1">{systemStatus.resources.memory.total}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Used:</span>
                        <p className="font-semibold mt-1">{systemStatus.resources.memory.used}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Free:</span>
                        <p className="font-semibold mt-1">{systemStatus.resources.memory.free}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Usage:</span>
                        <p className="font-semibold mt-1">{systemStatus.resources.memory.usagePercent}%</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            parseFloat(systemStatus.resources.memory.usagePercent) > 90
                              ? 'bg-red-600'
                              : parseFloat(systemStatus.resources.memory.usagePercent) > 70
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                          }`}
                          style={{ width: `${systemStatus.resources.memory.usagePercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Network */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 font-mono mb-3">Network</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                      <div>
                        <span className="text-gray-600">Hostname:</span>
                        <p className="font-semibold mt-1">{systemStatus.resources.network.hostname}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Interfaces:</span>
                        <p className="font-semibold mt-1">{systemStatus.resources.network.interfaces}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 font-mono">System Logs</h3>
                  <div className="flex gap-2">
                    <select
                      onChange={(e) => loadLogs(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    >
                      <option value="combined">Combined</option>
                      <option value="error">Errors Only</option>
                      <option value="access">Access Logs</option>
                    </select>
                    <button
                      onClick={() => loadLogs()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-mono"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {logs.length > 0 ? (
                    <div className="space-y-1 font-mono text-xs">
                      {logs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`${
                            log.level === 'error'
                              ? 'text-red-400'
                              : log.level === 'warn'
                              ? 'text-yellow-400'
                              : 'text-green-400'
                          }`}
                        >
                          {log.timestamp && (
                            <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}] </span>
                          )}
                          {log.level && <span className="text-blue-400">{log.level.toUpperCase()}: </span>}
                          {log.message || JSON.stringify(log)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 font-mono text-sm">No logs available</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDashboard;
