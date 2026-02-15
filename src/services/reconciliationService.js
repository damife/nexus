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

class ReconciliationService {
  constructor() {
    this.discrepancies = [];
    this.reconciliationReports = [];
  }

  // Perform daily reconciliation
  async performDailyReconciliation(date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const response = await api.post('/api/reconciliation/daily', { date });
      const result = response.data;

      // Store discrepancies for review
      this.discrepancies = result.discrepancies || [];
      
      // Store report
      this.reconciliationReports.unshift({
        date: targetDate,
        ...result,
        timestamp: new Date()
      });

      // Keep only last 30 reports
      if (this.reconciliationReports.length > 30) {
        this.reconciliationReports = this.reconciliationReports.slice(0, 30);
      }

      return result;
    } catch (error) {
      console.error('Error performing daily reconciliation:', error);
      throw error;
    }
  }

  // Get reconciliation history
  async getReconciliationHistory(params = {}) {
    try {
      const response = await api.get('/api/reconciliation/history', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting reconciliation history:', error);
      throw error;
    }
  }

  // Get specific reconciliation report
  async getReconciliationReport(date) {
    try {
      const response = await api.get(`/api/reconciliation/report/${date}`);
      return response.data;
    } catch (error) {
      console.error('Error getting reconciliation report:', error);
      throw error;
    }
  }

  // Get current discrepancies
  async getCurrentDiscrepancies() {
    try {
      const response = await api.get('/api/reconciliation/discrepancies');
      this.discrepancies = response.data;
      return response.data;
    } catch (error) {
      console.error('Error getting discrepancies:', error);
      return [];
    }
  }

  // Auto-fix discrepancies
  async autoFixDiscrepancies(discrepancyIds) {
    try {
      const response = await api.post('/api/reconciliation/auto-fix', {
        discrepancy_ids: discrepancyIds
      });
      
      // Update local discrepancies
      this.discrepancies = this.discrepancies.filter(
        d => !discrepancyIds.includes(d.id)
      );

      return response.data;
    } catch (error) {
      console.error('Error auto-fixing discrepancies:', error);
      throw error;
    }
  }

  // Manual discrepancy resolution
  async resolveDiscrepancy(discrepancyId, resolution, notes = '') {
    try {
      const response = await api.put(`/api/reconciliation/discrepancy/${discrepancyId}`, {
        resolution,
        notes
      });

      // Update local discrepancies
      const index = this.discrepancies.findIndex(d => d.id === discrepancyId);
      if (index !== -1) {
        this.discrepancies[index] = {
          ...this.discrepancies[index],
          status: 'resolved',
          resolution,
          notes,
          resolved_at: new Date()
        };
      }

      return response.data;
    } catch (error) {
      console.error('Error resolving discrepancy:', error);
      throw error;
    }
  }

  // Get reconciliation statistics
  async getReconciliationStats(timeframe = '30d') {
    try {
      const response = await api.get('/api/reconciliation/stats', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting reconciliation stats:', error);
      throw error;
    }
  }

  // Export reconciliation report
  async exportReport(date, format = 'csv') {
    try {
      const response = await api.get(`/api/reconciliation/export/${date}`, {
        params: { format },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reconciliation-report-${date}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }

  // Schedule automatic reconciliation
  async scheduleReconciliation(schedule) {
    try {
      const response = await api.post('/api/reconciliation/schedule', schedule);
      return response.data;
    } catch (error) {
      console.error('Error scheduling reconciliation:', error);
      throw error;
    }
  }

  // Get reconciliation schedule
  async getReconciliationSchedule() {
    try {
      const response = await api.get('/api/reconciliation/schedule');
      return response.data;
    } catch (error) {
      console.error('Error getting reconciliation schedule:', error);
      return null;
    }
  }

  // Cancel scheduled reconciliation
  async cancelScheduledReconciliation(scheduleId) {
    try {
      const response = await api.delete(`/api/reconciliation/schedule/${scheduleId}`);
      return response.data;
    } catch (error) {
      console.error('Error canceling scheduled reconciliation:', error);
      throw error;
    }
  }

  // Validate payment data integrity
  async validatePaymentIntegrity(paymentId) {
    try {
      const response = await api.get(`/api/reconciliation/validate/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('Error validating payment integrity:', error);
      throw error;
    }
  }

  // Get payment discrepancies by type
  getDiscrepanciesByType() {
    const byType = {};
    
    this.discrepancies.forEach(discrepancy => {
      if (!byType[discrepancy.type]) {
        byType[discrepancy.type] = [];
      }
      byType[discrepancy.type].push(discrepancy);
    });

    return byType;
  }

  // Get discrepancy summary
  getDiscrepancySummary() {
    const summary = {
      total: this.discrepancies.length,
      byType: {},
      bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      unresolved: 0,
      autoFixed: 0,
      manuallyResolved: 0
    };

    this.discrepancies.forEach(discrepancy => {
      // Count by type
      summary.byType[discrepancy.type] = (summary.byType[discrepancy.type] || 0) + 1;
      
      // Count by severity
      summary.bySeverity[discrepancy.severity] = (summary.bySeverity[discrepancy.severity] || 0) + 1;
      
      // Count by status
      if (discrepancy.status === 'unresolved') {
        summary.unresolved++;
      } else if (discrepancy.status === 'auto_fixed') {
        summary.autoFixed++;
      } else if (discrepancy.status === 'resolved') {
        summary.manuallyResolved++;
      }
    });

    return summary;
  }

  // Search discrepancies
  searchDiscrepancies(query, filters = {}) {
    let results = this.discrepancies;

    // Apply text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(discrepancy => 
        discrepancy.payment_id?.toLowerCase().includes(lowerQuery) ||
        discrepancy.type?.toLowerCase().includes(lowerQuery) ||
        discrepancy.description?.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply filters
    if (filters.type) {
      results = results.filter(d => d.type === filters.type);
    }
    if (filters.severity) {
      results = results.filter(d => d.severity === filters.severity);
    }
    if (filters.status) {
      results = results.filter(d => d.status === filters.status);
    }
    if (filters.dateFrom) {
      results = results.filter(d => new Date(d.created_at) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      results = results.filter(d => new Date(d.created_at) <= new Date(filters.dateTo));
    }

    return results;
  }

  // Get reconciliation health metrics
  async getReconciliationHealth() {
    try {
      const response = await api.get('/api/reconciliation/health');
      return response.data;
    } catch (error) {
      console.error('Error getting reconciliation health:', error);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  // Manual reconciliation trigger
  async triggerManualReconciliation(dateRange, options = {}) {
    try {
      const response = await api.post('/api/reconciliation/manual', {
        date_range: dateRange,
        options
      });
      return response.data;
    } catch (error) {
      console.error('Error triggering manual reconciliation:', error);
      throw error;
    }
  }

  // Get reconciliation recommendations
  async getRecommendations() {
    try {
      const response = await api.get('/api/reconciliation/recommendations');
      return response.data;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  // Apply reconciliation recommendations
  async applyRecommendations(recommendationIds) {
    try {
      const response = await api.post('/api/reconciliation/apply-recommendations', {
        recommendation_ids: recommendationIds
      });
      return response.data;
    } catch (error) {
      console.error('Error applying recommendations:', error);
      throw error;
    }
  }
}

export default new ReconciliationService();
