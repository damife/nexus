import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdvancedHealthPanel = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [charts, setCharts] = useState({
    responseTime: null,
    errorRate: null,
    systemResources: null,
    throughput: null
  });

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Load health data
  useEffect(() => {
    loadHealthData();
    if (autoRefresh) {
      const interval = setInterval(loadHealthData, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/health/advanced');
      setHealthData(response.data.data);
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const exportHealthReport = () => {
    if (!healthData) return;

    const report = {
      timestamp: new Date().toISOString(),
      overall: healthData.overall,
      healthScore: healthData.score,
      components: {
        database: healthData.components.database.status,
        api: healthData.components.api.status,
        system: healthData.components.system.status,
        services: healthData.components.services.status,
        security: healthData.components.security.status,
        performance: healthData.components.performance.status
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'blue';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'blue';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: darkMode ? '#fff' : '#000'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: darkMode ? '#fff' : '#000'
        },
        grid: {
          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        ticks: {
          color: darkMode ? '#fff' : '#000'
        },
        grid: {
          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <i className="fas fa-heartbeat text-blue-600 text-2xl mr-3"></i>
              <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Advanced Health Panel
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleAutoRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={exportHealthReport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <i className="fas fa-download mr-2"></i>
                Export Report
              </button>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                title="Toggle dark mode"
              >
                <i className={`fas ${darkMode ? 'fa-sun text-yellow-400' : 'fa-moon'}`}></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall Health Status */}
        <div className="mb-8">
          <div
            className={`rounded-xl shadow-lg p-6 text-white ${
              healthData?.overall === 'healthy'
                ? 'bg-gradient-to-r from-green-500 to-green-600'
                : healthData?.overall === 'warning'
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                : 'bg-gradient-to-r from-red-500 to-red-600'
            } ${healthData?.overall === 'critical' ? 'animate-pulse' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">System Health</h2>
                <p className="text-lg opacity-90">
                  Overall Status: <span className="font-bold">{healthData?.overall?.toUpperCase()}</span>
                </p>
                <p className="text-sm opacity-75">
                  Health Score: <span className="font-bold">{healthData?.score}%</span>
                </p>
              </div>
              <div className="text-6xl opacity-50">
                <i className="fas fa-shield-alt"></i>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{healthData?.alerts?.length || 0}</p>
                <p className="text-sm opacity-75">Active Alerts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{formatUptime(healthData?.uptime || 0)}</p>
                <p className="text-sm opacity-75">Uptime</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.round(healthData?.components?.performance?.responseTime?.avg || 0)}ms
                </p>
                <p className="text-sm opacity-75">Avg Response</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {(healthData?.components?.api?.metrics?.errorRate || 0).toFixed(1)}%
                </p>
                <p className="text-sm opacity-75">Error Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Component Health Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Database Health */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Database
              </h3>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium bg-${getStatusColor(
                  healthData?.components?.database?.status
                )}-100 text-${getStatusColor(healthData?.components?.database?.status)}-800`}
              >
                {healthData?.components?.database?.status?.toUpperCase()}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Response Time</span>
                <span className="text-sm font-medium">{healthData?.components?.database?.responseTime || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Connections</span>
                <span className="text-sm font-medium">
                  {healthData?.components?.database?.connections?.active || 0}/
                  {healthData?.components?.database?.connections?.total || 20}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Query Time</span>
                <span className="text-sm font-medium">
                  {Math.round(healthData?.components?.database?.performance?.avgQueryTime || 0)}ms
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-${getStatusColor(healthData?.components?.database?.status)}-600 h-2 rounded-full`}
                  style={{ width: `${healthData?.components?.database?.score || 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* API Health */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>API</h3>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium bg-${getStatusColor(
                  healthData?.components?.api?.status
                )}-100 text-${getStatusColor(healthData?.components?.api?.status)}-800`}
              >
                {healthData?.components?.api?.status?.toUpperCase()}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Response</span>
                <span className="text-sm font-medium">
                  {Math.round(healthData?.components?.api?.metrics?.avgResponseTime || 0)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Error Rate</span>
                <span className="text-sm font-medium">
                  {(healthData?.components?.api?.metrics?.errorRate || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Requests/min</span>
                <span className="text-sm font-medium">
                  {healthData?.components?.api?.throughput?.current || 0}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-${getStatusColor(healthData?.components?.api?.status)}-600 h-2 rounded-full`}
                  style={{ width: `${healthData?.components?.api?.score || 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* System Resources */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>System</h3>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium bg-${getStatusColor(
                  healthData?.components?.system?.status
                )}-100 text-${getStatusColor(healthData?.components?.system?.status)}-800`}
              >
                {healthData?.components?.system?.status?.toUpperCase()}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>CPU Usage</span>
                <span className="text-sm font-medium">
                  {Math.round(healthData?.components?.system?.cpu?.loadAverage?.[0] || 0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Memory</span>
                <span className="text-sm font-medium">
                  {Math.round(healthData?.components?.system?.memory?.systemUtilization || 0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Disk</span>
                <span className="text-sm font-medium">
                  {healthData?.components?.system?.disk?.utilization || 0}%
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-${getStatusColor(healthData?.components?.system?.status)}-600 h-2 rounded-full`}
                  style={{ width: `${healthData?.components?.system?.score || 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Services Health */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Services</h3>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium bg-${getStatusColor(
                  healthData?.components?.services?.status
                )}-100 text-${getStatusColor(healthData?.components?.services?.status)}-800`}
              >
                {healthData?.components?.services?.status?.toUpperCase()}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Healthy</span>
                <span className="text-sm font-medium">{healthData?.components?.services?.healthyCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total</span>
                <span className="text-sm font-medium">{healthData?.components?.services?.totalCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Uptime</span>
                <span className="text-sm font-medium">
                  {Math.round(
                    ((healthData?.components?.services?.healthyCount || 0) /
                      (healthData?.components?.services?.totalCount || 1)) *
                      100
                  )}%
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-${getStatusColor(healthData?.components?.services?.status)}-600 h-2 rounded-full`}
                  style={{ width: `${healthData?.components?.services?.score || 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Security Health */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Security</h3>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium bg-${getStatusColor(
                  healthData?.components?.security?.status
                )}-100 text-${getStatusColor(healthData?.components?.security?.status)}-800`}
              >
                {healthData?.components?.security?.status?.toUpperCase()}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Security Events</span>
                <span className="text-sm font-medium">
                  {healthData?.components?.security?.metrics?.totalEvents || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Failed Logins</span>
                <span className="text-sm font-medium">
                  {healthData?.components?.security?.metrics?.failedLogins || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Blocked Requests</span>
                <span className="text-sm font-medium">
                  {healthData?.components?.security?.metrics?.blockedRequests || 0}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-${getStatusColor(healthData?.components?.security?.status)}-600 h-2 rounded-full`}
                  style={{ width: `${healthData?.components?.security?.score || 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Performance Health */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Performance</h3>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium bg-${getStatusColor(
                  healthData?.components?.performance?.status
                )}-100 text-${getStatusColor(healthData?.components?.performance?.status)}-800`}
              >
                {healthData?.components?.performance?.status?.toUpperCase()}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>P95 Response</span>
                <span className="text-sm font-medium">
                  {Math.round(healthData?.components?.performance?.responseTime?.p95 || 0)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Throughput</span>
                <span className="text-sm font-medium">
                  {healthData?.components?.performance?.throughput?.current || 0} req/s
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Slow Requests</span>
                <span className="text-sm font-medium">
                  {(healthData?.components?.performance?.slowRequestRate || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-${getStatusColor(healthData?.components?.performance?.status)}-600 h-2 rounded-full`}
                  style={{ width: `${healthData?.components?.performance?.score || 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Response Time Chart */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Response Time Trends
            </h3>
            <div className="h-64">
              {healthData?.trends && (
                <Line
                  data={{
                    labels: healthData.trends.map(trend => new Date(trend.hour).toLocaleTimeString()),
                    datasets: [
                      {
                        label: 'Response Time (ms)',
                        data: healthData.trends.map(trend => trend.avg_response_time || 0),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                      }
                    ]
                  }}
                  options={chartOptions}
                />
              )}
            </div>
          </div>

          {/* Error Rate Chart */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Error Rate Trends
            </h3>
            <div className="h-64">
              {healthData?.trends && (
                <Line
                  data={{
                    labels: healthData.trends.map(trend => new Date(trend.hour).toLocaleTimeString()),
                    datasets: [
                      {
                        label: 'Error Rate (%)',
                        data: healthData.trends.map(trend => {
                          const errorRate = (trend.error_count / trend.request_count) * 100;
                          return isNaN(errorRate) ? 0 : errorRate;
                        }),
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                      }
                    ]
                  }}
                  options={chartOptions}
                />
              )}
            </div>
          </div>

          {/* System Resources Chart */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              System Resources
            </h3>
            <div className="h-64">
              {healthData?.trends && (
                <Line
                  data={{
                    labels: healthData.trends.map(trend => new Date(trend.hour).toLocaleTimeString()),
                    datasets: [
                      {
                        label: 'CPU (%)',
                        data: healthData.trends.map(trend => trend.avg_cpu || 0),
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4,
                        fill: true
                      },
                      {
                        label: 'Memory (%)',
                        data: healthData.trends.map(trend => trend.avg_memory || 0),
                        borderColor: 'rgb(251, 146, 60)',
                        backgroundColor: 'rgba(251, 146, 60, 0.1)',
                        tension: 0.4,
                        fill: true
                      }
                    ]
                  }}
                  options={chartOptions}
                />
              )}
            </div>
          </div>

          {/* Throughput Chart */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Request Throughput
            </h3>
            <div className="h-64">
              {healthData?.trends && (
                <Bar
                  data={{
                    labels: healthData.trends.map(trend => new Date(trend.hour).toLocaleTimeString()),
                    datasets: [
                      {
                        label: 'Requests/Second',
                        data: healthData.trends.map(trend => trend.request_count || 0),
                        backgroundColor: 'rgba(147, 51, 234, 0.8)',
                        borderColor: 'rgb(147, 51, 234)',
                        borderWidth: 1
                      }
                    ]
                  }}
                  options={chartOptions}
                />
              )}
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        <div className={`rounded-xl shadow-lg p-6 mb-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Active Alerts
            </h3>
            <button
              onClick={() => {
                // Clear all alerts functionality
                console.log('Clear all alerts');
              }}
              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {healthData?.alerts && healthData.alerts.length > 0 ? (
              healthData.alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 bg-${getSeverityColor(
                    alert.severity
                  )}-50 border border-${getSeverityColor(alert.severity)}-200 rounded-lg`}
                >
                  <div className="flex items-center">
                    <i className={`fas fa-exclamation-triangle text-${getSeverityColor(alert.severity)}-600 mr-3`}></i>
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {alert.alert_type}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {alert.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => {
                        // Dismiss alert functionality
                        console.log('Dismiss alert:', alert.id);
                      }}
                      className={`text-${getSeverityColor(alert.severity)}-600 hover:text-${getSeverityColor(
                        alert.severity
                      )}-800`}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-center py-4 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                No active alerts
              </p>
            )}
          </div>
        </div>

        {/* Recommendations Section */}
        <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
            System Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthData?.recommendations && healthData.recommendations.length > 0 ? (
              healthData.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 bg-${getPriorityColor(rec.priority)}-50 border border-${getPriorityColor(
                    rec.priority
                  )}-200 rounded-lg`}
                >
                  <div className="flex items-start">
                    <i className={`fas fa-lightbulb text-${getPriorityColor(rec.priority)}-600 mt-1 mr-3`}></i>
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {rec.component}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                        {rec.recommendation}
                      </p>
                      <span
                        className={`inline-block mt-2 px-2 py-1 text-xs font-medium bg-${getPriorityColor(
                          rec.priority
                        )}-100 text-${getPriorityColor(rec.priority)}-800 rounded`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-center col-span-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                No recommendations at this time
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdvancedHealthPanel;
