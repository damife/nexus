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

const AnalyticsDashboard = () => {
  const [currentData, setCurrentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [darkMode, setDarkMode] = useState(false);
  const [chartTypes, setChartTypes] = useState({
    volume: 'line',
    value: 'line',
    risk: 'bar',
    performance: 'line'
  });

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Load analytics data
  useEffect(() => {
    refreshDashboard();
  }, [timeRange]);

  const refreshDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/analytics/advanced?timeRange=${timeRange}`);
      setCurrentData(response.data.data);
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const exportData = () => {
    if (!currentData) return;

    const data = {
      timestamp: new Date().toISOString(),
      timeRange,
      data: currentData
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReport = async (reportType) => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/analytics/reports/${reportType}`, {
        timeRange,
        filters: {}
      });

      const report = response.data.data;
      downloadReport(report, reportType);

    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (report, reportType) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleChartType = (chartName) => {
    setChartTypes(prev => ({
      ...prev,
      [chartName]: prev[chartName] === 'line' ? 'bar' : 'line'
    }));
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return '$' + (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return '$' + (amount / 1000).toFixed(1) + 'K';
    }
    return '$' + (amount?.toFixed(2) || '0');
  };

  const updateGrowthIndicator = (trend) => {
    if (trend > 0) {
      return (
        <>
          <i className="fas fa-arrow-up text-green-500"></i>
          <span className="text-green-500">+{trend.toFixed(1)}%</span>
        </>
      );
    } else if (trend < 0) {
      return (
        <>
          <i className="fas fa-arrow-down text-red-500"></i>
          <span className="text-red-500">{trend.toFixed(1)}%</span>
        </>
      );
    } else {
      return (
        <>
          <i className="fas fa-minus text-gray-500"></i>
          <span className="text-gray-500">0%</span>
        </>
      );
    }
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

  if (loading && !currentData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const overview = currentData?.sections?.overview;
  const transactions = currentData?.sections?.transactions;
  const risk = currentData?.sections?.risk;
  const performance = currentData?.sections?.performance;
  const predictive = currentData?.sections?.predictive;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <i className="fas fa-chart-line text-blue-600 text-2xl mr-3"></i>
              <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Advanced Analytics Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'border-gray-300 text-gray-900'
                }`}
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <button
                onClick={refreshDashboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Refresh
              </button>
              <button
                onClick={exportData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <i className="fas fa-download mr-2"></i>
                Export
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
        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Transactions
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatNumber(overview?.metrics?.total_transactions)}
                </p>
                <p className="text-sm mt-1">
                  {updateGrowthIndicator(overview?.trends?.volume || 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <i className="fas fa-exchange-alt text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Value
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(overview?.metrics?.total_value)}
                </p>
                <p className="text-sm mt-1">
                  {updateGrowthIndicator(overview?.trends?.value || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <i className="fas fa-dollar-sign text-green-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Success Rate
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {overview?.kpis?.successRate}%
                </p>
                <p className="text-sm mt-1">
                  {updateGrowthIndicator(overview?.trends?.success || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <i className="fas fa-check-circle text-purple-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Active Users
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatNumber(overview?.metrics?.unique_users)}
                </p>
                <p className="text-sm mt-1">
                  {updateGrowthIndicator(overview?.trends?.users || 0)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <i className="fas fa-users text-orange-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Transaction Volume Chart */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Transaction Volume
              </h3>
              <button
                onClick={() => toggleChartType('volume')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                <i className={`fas fa-chart-${chartTypes.volume === 'line' ? 'line' : 'bar'}`}></i>
              </button>
            </div>
            <div className="h-64">
              {transactions?.dailyTrends && (
                <>
                  {chartTypes.volume === 'line' ? (
                    <Line
                      data={{
                        labels: transactions.dailyTrends.map(d => new Date(d.date).toLocaleDateString()),
                        datasets: [{
                          label: 'Transaction Volume',
                          data: transactions.dailyTrends.map(d => d.volume),
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          tension: 0.4,
                          fill: true
                        }]
                      }}
                      options={chartOptions}
                    />
                  ) : (
                    <Bar
                      data={{
                        labels: transactions.dailyTrends.map(d => new Date(d.date).toLocaleDateString()),
                        datasets: [{
                          label: 'Transaction Volume',
                          data: transactions.dailyTrends.map(d => d.volume),
                          backgroundColor: 'rgba(59, 130, 246, 0.8)',
                          borderColor: 'rgb(59, 130, 246)',
                          borderWidth: 1
                        }]
                      }}
                      options={chartOptions}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Transaction Value Chart */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Transaction Value
              </h3>
              <button
                onClick={() => toggleChartType('value')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                <i className={`fas fa-chart-${chartTypes.value === 'line' ? 'line' : 'bar'}`}></i>
              </button>
            </div>
            <div className="h-64">
              {transactions?.dailyTrends && (
                <>
                  {chartTypes.value === 'line' ? (
                    <Line
                      data={{
                        labels: transactions.dailyTrends.map(d => new Date(d.date).toLocaleDateString()),
                        datasets: [{
                          label: 'Transaction Value ($)',
                          data: transactions.dailyTrends.map(d => d.total_value),
                          borderColor: 'rgb(34, 197, 94)',
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          tension: 0.4,
                          fill: true
                        }]
                      }}
                      options={chartOptions}
                    />
                  ) : (
                    <Bar
                      data={{
                        labels: transactions.dailyTrends.map(d => new Date(d.date).toLocaleDateString()),
                        datasets: [{
                          label: 'Transaction Value ($)',
                          data: transactions.dailyTrends.map(d => d.total_value),
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          borderColor: 'rgb(34, 197, 94)',
                          borderWidth: 1
                        }]
                      }}
                      options={chartOptions}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Risk Analysis Chart */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Risk Analysis
              </h3>
              <button
                onClick={() => toggleChartType('risk')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                <i className={`fas fa-chart-${chartTypes.risk === 'line' ? 'line' : 'bar'}`}></i>
              </button>
            </div>
            <div className="h-64">
              {risk?.riskDistribution && (
                <>
                  {chartTypes.risk === 'bar' ? (
                    <Bar
                      data={{
                        labels: ['Low', 'Medium', 'High'],
                        datasets: [{
                          label: 'Risk Distribution',
                          data: [
                            risk.riskDistribution.find(r => r.risk_level === 'LOW')?.count || 0,
                            risk.riskDistribution.find(r => r.risk_level === 'MEDIUM')?.count || 0,
                            risk.riskDistribution.find(r => r.risk_level === 'HIGH')?.count || 0
                          ],
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(251, 146, 60, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                          ]
                        }]
                      }}
                      options={chartOptions}
                    />
                  ) : (
                    <Line
                      data={{
                        labels: ['Low', 'Medium', 'High'],
                        datasets: [{
                          label: 'Risk Distribution',
                          data: [
                            risk.riskDistribution.find(r => r.risk_level === 'LOW')?.count || 0,
                            risk.riskDistribution.find(r => r.risk_level === 'MEDIUM')?.count || 0,
                            risk.riskDistribution.find(r => r.risk_level === 'HIGH')?.count || 0
                          ],
                          borderColor: 'rgb(239, 68, 68)',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          tension: 0.4,
                          fill: true
                        }]
                      }}
                      options={chartOptions}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Performance Metrics Chart */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Performance Metrics
              </h3>
              <button
                onClick={() => toggleChartType('performance')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                <i className={`fas fa-chart-${chartTypes.performance === 'line' ? 'line' : 'bar'}`}></i>
              </button>
            </div>
            <div className="h-64">
              {performance?.performanceTrends && (
                <>
                  {chartTypes.performance === 'line' ? (
                    <Line
                      data={{
                        labels: performance.performanceTrends.map(d => new Date(d.hour).toLocaleTimeString()),
                        datasets: [
                          {
                            label: 'Response Time (ms)',
                            data: performance.performanceTrends.map(d => d.avg_response_time),
                            borderColor: 'rgb(147, 51, 234)',
                            backgroundColor: 'rgba(147, 51, 234, 0.1)',
                            tension: 0.4,
                            fill: true
                          },
                          {
                            label: 'Success Rate (%)',
                            data: performance.performanceTrends.map(d => 100 - (d.error_rate || 0)),
                            borderColor: 'rgb(34, 197, 94)',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            tension: 0.4,
                            fill: true
                          }
                        ]
                      }}
                      options={chartOptions}
                    />
                  ) : (
                    <Bar
                      data={{
                        labels: performance.performanceTrends.map(d => new Date(d.hour).toLocaleTimeString()),
                        datasets: [
                          {
                            label: 'Response Time (ms)',
                            data: performance.performanceTrends.map(d => d.avg_response_time),
                            backgroundColor: 'rgba(147, 51, 234, 0.8)',
                            borderColor: 'rgb(147, 51, 234)',
                            borderWidth: 1
                          },
                          {
                            label: 'Success Rate (%)',
                            data: performance.performanceTrends.map(d => 100 - (d.error_rate || 0)),
                            backgroundColor: 'rgba(34, 197, 94, 0.8)',
                            borderColor: 'rgb(34, 197, 94)',
                            borderWidth: 1
                          }
                        ]
                      }}
                      options={chartOptions}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Analytics Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Transaction Types */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Transaction Types
            </h3>
            <div className="space-y-3">
              {transactions?.volumeByType?.map((type, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {type.message_type}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{formatNumber(type.volume)}</span>
                    <span className={`text-xs ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {formatCurrency(type.total_value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Currency Distribution */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Currency Distribution
            </h3>
            <div className="space-y-3">
              {transactions?.volumeByCurrency?.map((currency, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currency.currency}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{formatNumber(currency.transaction_count)}</span>
                    <span className={`text-xs ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {formatCurrency(currency.total_volume)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Distribution */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Status Distribution
            </h3>
            <div className="space-y-3">
              {transactions?.statusDistribution?.map((status, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {status.status}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{formatNumber(status.count)}</span>
                    <span className={`text-xs ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {status.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Predictive Analytics */}
        <div className={`rounded-xl shadow-lg p-6 mb-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Predictive Analytics
            </h3>
            <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              AI-powered insights
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <i className="fas fa-chart-line text-blue-600 text-3xl mb-3"></i>
              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Volume Prediction
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                {predictive?.volumePrediction?.trend || 'stable'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                Confidence: {Math.round((predictive?.volumePrediction?.confidence || 0) * 100)}%
              </p>
            </div>
            <div className="text-center">
              <i className="fas fa-shield-alt text-green-600 text-3xl mb-3"></i>
              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Risk Prediction
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                {predictive?.riskPrediction?.trend || 'stable'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                Confidence: {Math.round((predictive?.riskPrediction?.confidence || 0) * 100)}%
              </p>
            </div>
            <div className="text-center">
              <i className="fas fa-tachometer-alt text-purple-600 text-3xl mb-3"></i>
              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Performance Prediction
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                {predictive?.performancePrediction?.trend || 'stable'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                Confidence: {Math.round((predictive?.performancePrediction?.confidence || 0) * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* Reports Section */}
        <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Generate Reports
            </h3>
            <button onClick={refreshDashboard} className="text-sm text-blue-600 hover:text-blue-800">
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className={`rounded-lg p-4 cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => generateReport('executive')}
            >
              <div className="flex items-center mb-3">
                <i className="fas fa-chart-pie text-blue-600 text-xl mr-3"></i>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Executive Report
                </h4>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                High-level overview for executives
              </p>
            </div>

            <div
              className={`rounded-lg p-4 cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => generateReport('compliance')}
            >
              <div className="flex items-center mb-3">
                <i className="fas fa-shield-alt text-green-600 text-xl mr-3"></i>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Compliance Report
                </h4>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Regulatory compliance analysis
              </p>
            </div>

            <div
              className={`rounded-lg p-4 cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => generateReport('performance')}
            >
              <div className="flex items-center mb-3">
                <i className="fas fa-tachometer-alt text-purple-600 text-xl mr-3"></i>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Performance Report
                </h4>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                System performance metrics
              </p>
            </div>

            <div
              className={`rounded-lg p-4 cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => generateReport('financial')}
            >
              <div className="flex items-center mb-3">
                <i className="fas fa-dollar-sign text-green-600 text-xl mr-3"></i>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Financial Report
                </h4>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Financial analysis and insights
              </p>
            </div>

            <div
              className={`rounded-lg p-4 cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => generateReport('risk')}
            >
              <div className="flex items-center mb-3">
                <i className="fas fa-exclamation-triangle text-red-600 text-xl mr-3"></i>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Risk Report
                </h4>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Risk assessment and analysis
              </p>
            </div>

            <div
              className={`rounded-lg p-4 cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => generateReport('operational')}
            >
              <div className="flex items-center mb-3">
                <i className="fas fa-cogs text-orange-600 text-xl mr-3"></i>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Operational Report
                </h4>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Operations and system health
              </p>
            </div>

            <div
              className={`rounded-lg p-4 cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => generateReport('user_activity')}
            >
              <div className="flex items-center mb-3">
                <i className="fas fa-users text-blue-600 text-xl mr-3"></i>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  User Activity Report
                </h4>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                User behavior and engagement
              </p>
            </div>

            <div
              className={`rounded-lg p-4 cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => generateReport('custom')}
            >
              <div className="flex items-center mb-3">
                <i className="fas fa-cog text-gray-600 text-xl mr-3"></i>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Custom Report
                </h4>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Create custom analytics report
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnalyticsDashboard;
