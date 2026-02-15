import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/pages/login';
    }
    return Promise.reject(error);
  }
);

class BalanceService {
  // Get user balances across all currencies
  async getMultiCurrencyBalances() {
    try {
      const response = await api.get('/api/balances/multi-currency');
      return response.data;
    } catch (error) {
      console.error('Error getting multi-currency balances:', error);
      throw error;
    }
  }

  // Get balance for specific currency
  async getBalance(currency = 'USD') {
    try {
      const response = await api.get(`/api/balances/${currency}`);
      return response.data;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  // Get complete transaction history (deposits and deductions)
  async getTransactionHistory(params = {}) {
    try {
      const response = await api.get('/api/balances/history', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw error;
    }
  }

  // Get deposit history only
  async getDepositHistory(params = {}) {
    try {
      const response = await api.get('/api/balances/deposits', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting deposit history:', error);
      throw error;
    }
  }

  // Get deduction history only
  async getDeductionHistory(params = {}) {
    try {
      const response = await api.get('/api/balances/deductions', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting deduction history:', error);
      throw error;
    }
  }

  // Get balance statistics
  async getBalanceStats() {
    try {
      const response = await api.get('/api/balances/stats');
      return response.data;
    } catch (error) {
      console.error('Error getting balance stats:', error);
      throw error;
    }
  }

  // Get real-time balance updates (WebSocket simulation)
  subscribeToBalanceUpdates(callback) {
    // In a real implementation, this would use WebSocket
    // For now, we'll simulate with polling
    const interval = setInterval(async () => {
      try {
        const balances = await this.getMultiCurrencyBalances();
        callback(balances);
      } catch (error) {
        console.error('Error in balance update polling:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }

  // Format balance display
  formatBalance(amount, currency) {
    const decimals = this.getDecimalPlaces(currency);
    return parseFloat(amount).toFixed(decimals);
  }

  // Get decimal places for currency
  getDecimalPlaces(currency) {
    const decimalMap = {
      'BTC': 8,
      'ETH': 18,
      'USDT': 6,
      'USDC': 6,
      'LTC': 8,
      'BCH': 8,
      'TRX': 6,
      'USD': 2,
      'EUR': 2
    };
    return decimalMap[currency] || 2;
  }

  // Calculate total USD value of all balances
  async getTotalUSDValue(balances) {
    try {
      let totalUSD = 0;
      
      for (const balance of balances) {
        if (balance.currency === 'USD') {
          totalUSD += parseFloat(balance.balance);
        } else {
          // Get exchange rate to USD
          const rate = await this.getExchangeRate(balance.currency, 'USD');
          totalUSD += parseFloat(balance.balance) * rate;
        }
      }
      
      return totalUSD;
    } catch (error) {
      console.error('Error calculating total USD value:', error);
      return 0;
    }
  }

  // Get exchange rate
  async getExchangeRate(fromCurrency, toCurrency) {
    try {
      const response = await api.get(`/api/payments/exchange-rate/${fromCurrency}/${toCurrency}`);
      return response.data.rate;
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      return 1;
    }
  }

  // Get transaction summary
  async getTransactionSummary(timeframe = '30d') {
    try {
      const response = await api.get('/api/balances/summary', { 
        params: { timeframe } 
      });
      return response.data;
    } catch (error) {
      console.error('Error getting transaction summary:', error);
      throw error;
    }
  }

  // Export transaction history
  async exportHistory(format = 'csv', filters = {}) {
    try {
      const response = await api.get('/api/balances/export', {
        params: { format, ...filters },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transaction-history.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting history:', error);
      throw error;
    }
  }

  // Search transactions
  async searchTransactions(query, filters = {}) {
    try {
      const response = await api.get('/api/balances/search', {
        params: { q: query, ...filters }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching transactions:', error);
      throw error;
    }
  }

  // Get balance chart data
  async getBalanceChartData(timeframe = '7d') {
    try {
      const response = await api.get('/api/balances/chart', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting chart data:', error);
      throw error;
    }
  }
}

export default new BalanceService();
