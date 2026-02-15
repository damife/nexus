import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

class HealthService {
  constructor() {
    this.healthStatus = {
      api: { healthy: true, lastCheck: new Date(), responseTime: 0 },
      database: { healthy: true, lastCheck: new Date(), responseTime: 0 },
      nowpayments: { healthy: true, lastCheck: new Date(), responseTime: 0 },
      webhooks: { healthy: true, lastCheck: new Date(), responseTime: 0 }
    };
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  // Start health monitoring
  startMonitoring(intervalMs = 60000) {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);

    // Initial check
    this.performHealthCheck();
  }

  // Stop health monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  // Perform comprehensive health check
  async performHealthCheck() {
    const checks = [
      { name: 'api', check: this.checkApiHealth.bind(this) },
      { name: 'database', check: this.checkDatabaseHealth.bind(this) },
      { name: 'nowpayments', check: this.checkNowPaymentsHealth.bind(this) },
      { name: 'webhooks', check: this.checkWebhookHealth.bind(this) }
    ];

    const results = await Promise.allSettled(
      checks.map(({ name, check }) => this.performCheck(name, check))
    );

    // Update health status
    results.forEach((result, index) => {
      const checkName = checks[index].name;
      if (result.status === 'fulfilled') {
        this.healthStatus[checkName] = result.value;
      } else {
        this.healthStatus[checkName] = {
          healthy: false,
          lastCheck: new Date(),
          responseTime: 0,
          error: result.reason.message
        };
      }
    });

    // Emit health status update
    this.emitHealthUpdate();

    // Check if any critical services are down
    const criticalServices = ['api', 'database'];
    const hasCriticalFailure = criticalServices.some(
      service => !this.healthStatus[service].healthy
    );

    if (hasCriticalFailure) {
      this.alertAdmin();
    }

    return this.healthStatus;
  }

  // Perform individual check with timing
  async performCheck(name, checkFunction) {
    const startTime = Date.now();
    try {
      const result = await checkFunction();
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        lastCheck: new Date(),
        responseTime,
        ...result
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: false,
        lastCheck: new Date(),
        responseTime,
        error: error.message
      };
    }
  }

  // Check API health
  async checkApiHealth() {
    try {
      const response = await api.get('/api/health', { timeout: 5000 });
      return { status: response.data.status, uptime: response.data.uptime };
    } catch (error) {
      throw new Error(`API health check failed: ${error.message}`);
    }
  }

  // Check database health
  async checkDatabaseHealth() {
    try {
      const response = await api.get('/api/health/database', { timeout: 5000 });
      return { 
        status: response.data.status, 
        connections: response.data.connections,
        queryTime: response.data.queryTime 
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  // Check NowPayments API health
  async checkNowPaymentsHealth() {
    try {
      const response = await api.get('/api/payments/health', { timeout: 10000 });
      return { 
        status: response.data.status,
        apiStatus: response.data.apiStatus,
        lastSync: response.data.lastSync
      };
    } catch (error) {
      throw new Error(`NowPayments health check failed: ${error.message}`);
    }
  }

  // Check webhook health
  async checkWebhookHealth() {
    try {
      const response = await api.get('/api/payments/webhooks/health', { timeout: 5000 });
      return { 
        status: response.data.status,
        lastReceived: response.data.lastReceived,
        successRate: response.data.successRate
      };
    } catch (error) {
      throw new Error(`Webhook health check failed: ${error.message}`);
    }
  }

  // Get current health status
  getHealthStatus() {
    return { ...this.healthStatus };
  }

  // Get overall health score
  getHealthScore() {
    const services = Object.values(this.healthStatus);
    const healthyServices = services.filter(service => service.healthy).length;
    return Math.round((healthyServices / services.length) * 100);
  }

  // Check if system is healthy
  isHealthy() {
    return this.getHealthScore() >= 75; // 75% of services must be healthy
  }

  // Get health metrics
  async getHealthMetrics(timeframe = '24h') {
    try {
      const response = await api.get('/api/health/metrics', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting health metrics:', error);
      return {};
    }
  }

  // Get performance metrics
  async getPerformanceMetrics() {
    try {
      const response = await api.get('/api/health/performance');
      return response.data;
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {};
    }
  }

  // Get error rates
  async getErrorRates(timeframe = '1h') {
    try {
      const response = await api.get('/api/health/error-rates', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting error rates:', error);
      return {};
    }
  }

  // Test specific endpoint
  async testEndpoint(endpoint, method = 'GET', data = null) {
    try {
      const startTime = Date.now();
      let response;

      switch (method.toUpperCase()) {
        case 'GET':
          response = await api.get(endpoint);
          break;
        case 'POST':
          response = await api.post(endpoint, data);
          break;
        case 'PUT':
          response = await api.put(endpoint, data);
          break;
        case 'DELETE':
          response = await api.delete(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  // Run diagnostic tests
  async runDiagnostics() {
    const tests = [
      { name: 'API Connectivity', test: () => this.testEndpoint('/api/health') },
      { name: 'Database Connection', test: () => this.testEndpoint('/api/health/database') },
      { name: 'NowPayments API', test: () => this.testEndpoint('/api/payments/health') },
      { name: 'Payment Creation', test: () => this.testPaymentCreation() },
      { name: 'Balance Retrieval', test: () => this.testBalanceRetrieval() }
    ];

    const results = [];
    for (const { name, test } of tests) {
      try {
        const result = await test();
        results.push({
          name,
          success: result.success,
          responseTime: result.responseTime,
          details: result
        });
      } catch (error) {
        results.push({
          name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Test payment creation
  async testPaymentCreation() {
    try {
      const response = await api.post('/api/payments/test-create', {
        amount: 1,
        currency: 'USDT',
        test: true
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Test balance retrieval
  async testBalanceRetrieval() {
    try {
      const response = await api.get('/api/balances/USD');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Emit health update event
  emitHealthUpdate() {
    const event = new CustomEvent('healthUpdate', {
      detail: {
        status: this.healthStatus,
        score: this.getHealthScore(),
        healthy: this.isHealthy(),
        timestamp: new Date()
      }
    });
    window.dispatchEvent(event);
  }

  // Alert admin about health issues
  alertAdmin() {
    const unhealthyServices = Object.entries(this.healthStatus)
      .filter(([_, status]) => !status.healthy)
      .map(([name, status]) => `${name}: ${status.error || 'Unknown error'}`);

    if (unhealthyServices.length > 0) {
      console.error('Health Alert - Unhealthy services:', unhealthyServices);
      
      // In production, this would send email/SMS/alert to admin
      // For now, we'll just emit a system event
      const event = new CustomEvent('systemAlert', {
        detail: {
          type: 'health',
          message: 'Critical services are unhealthy',
          services: unhealthyServices,
          timestamp: new Date()
        }
      });
      window.dispatchEvent(event);
    }
  }

  // Get system uptime
  async getSystemUptime() {
    try {
      const response = await api.get('/api/health/uptime');
      return response.data;
    } catch (error) {
      return { uptime: 0, error: error.message };
    }
  }

  // Cleanup
  cleanup() {
    this.stopMonitoring();
  }
}

export default new HealthService();
