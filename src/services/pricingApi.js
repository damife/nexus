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

export const pricingApi = {
  // Get all pricing configurations
  getAllPricing: () => api.get('/api/pricing'),
  
  // Get pricing for specific message type
  getPricing: (messageType, params = {}) => api.get(`/api/pricing/${messageType}`, { params }),
  
  // Create new pricing
  createPricing: (data) => api.post('/api/pricing', data),
  
  // Update pricing
  updatePricing: (messageType, data) => api.put(`/api/pricing/${messageType}`, data),
  
  // Get pricing history
  getPricingHistory: (messageType, params = {}) => api.get(`/api/pricing/${messageType}/history`, { params }),
  
  // Schedule pricing change
  scheduleChange: (data) => api.post('/api/pricing/schedule', data),
  
  // Get scheduled changes
  getScheduledChanges: () => api.get('/api/pricing/scheduled/changes'),
  
  // Calculate fee
  calculateFee: (data) => api.post('/api/pricing/calculate', data),
  
  // Get statistics
  getStatistics: () => api.get('/api/pricing/statistics/overview'),
  
  // Delete pricing
  deletePricing: (messageType, params = {}) => api.delete(`/api/pricing/${messageType}`, { params }),
  
  // Get supported configurations
  getSupported: () => api.get('/api/pricing/config/supported'),
};

export default pricingApi;
