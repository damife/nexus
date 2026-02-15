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

export const depositApi = {
  // Get user balance
  getBalance: () => api.get('/api/deposits/balance'),
  
  // Get balance history
  getBalanceHistory: (params = {}) => api.get('/api/deposits/balance-history', { params }),
  
  // Get supported cryptocurrencies
  getCryptocurrencies: () => api.get('/api/deposits/cryptocurrencies'),
  
  // Create new deposit
  createDeposit: (data) => api.post('/api/deposits/create', data),
  
  // Get deposit status
  getDepositStatus: (depositId) => api.get(`/api/deposits/status/${depositId}`),
  
  // Get all deposits
  getDeposits: (params = {}) => api.get('/api/deposits/list', { params }),
  
  // Get deposit statistics
  getStatistics: () => api.get('/api/deposits/statistics'),
};

export default depositApi;
