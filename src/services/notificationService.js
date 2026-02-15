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

class NotificationService {
  constructor() {
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  // Subscribe to real-time notifications
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  // Emit notification to subscribers
  emit(eventType, data) {
    const callbacks = this.subscribers.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in notification callback:', error);
        }
      });
    }
  }

  // Initialize WebSocket connection (simulated with polling)
  initializeNotifications() {
    // In production, this would use actual WebSocket
    this.startPolling();
    this.setupVisibilityChangeListener();
  }

  // Start polling for notifications
  startPolling() {
    this.pollInterval = setInterval(async () => {
      try {
        await this.checkNotifications();
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    }, 5000); // Poll every 5 seconds
  }

  // Check for new notifications
  async checkNotifications() {
    try {
      const response = await api.get('/api/notifications/check');
      const notifications = response.data;

      if (notifications && notifications.length > 0) {
        notifications.forEach(notification => {
          this.emit(notification.type, notification);
        });
      }
    } catch (error) {
      // Don't throw error for polling failures
      console.error('Notification polling error:', error);
    }
  }

  // Setup visibility change listener (pause polling when tab is hidden)
  setupVisibilityChangeListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pausePolling();
      } else {
        this.resumePolling();
      }
    });
  }

  // Pause polling when tab is hidden
  pausePolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Resume polling when tab is visible
  resumePolling() {
    if (!this.pollInterval) {
      this.startPolling();
    }
  }

  // Send payment status notification
  notifyPaymentStatus(paymentData) {
    this.emit('payment_status', {
      type: 'payment_status',
      payment_id: paymentData.payment_id,
      status: paymentData.status,
      amount: paymentData.amount,
      currency: paymentData.currency,
      timestamp: new Date().toISOString(),
      message: this.getPaymentStatusMessage(paymentData.status, paymentData.amount, paymentData.currency)
    });
  }

  // Get payment status message
  getPaymentStatusMessage(status, amount, currency) {
    const messages = {
      'waiting': `Payment of ${amount} ${currency} is waiting for confirmation`,
      'confirming': `Payment of ${amount} ${currency} is being confirmed`,
      'finished': `Payment of ${amount} ${currency} completed successfully!`,
      'failed': `Payment of ${amount} ${currency} failed`,
      'expired': `Payment of ${amount} ${currency} expired`,
      'partially_paid': `Payment of ${amount} ${currency} partially paid`
    };
    return messages[status] || `Payment status updated to ${status}`;
  }

  // Send balance update notification
  notifyBalanceUpdate(balanceData) {
    this.emit('balance_update', {
      type: 'balance_update',
      currency: balanceData.currency,
      balance: balanceData.balance,
      previous_balance: balanceData.previous_balance,
      change: balanceData.change,
      timestamp: new Date().toISOString(),
      message: `Balance updated: ${balanceData.change > 0 ? '+' : ''}${balanceData.change} ${balanceData.currency}`
    });
  }

  // Send deposit notification
  notifyDeposit(depositData) {
    this.emit('deposit', {
      type: 'deposit',
      payment_id: depositData.payment_id,
      amount: depositData.amount,
      currency: depositData.currency,
      status: depositData.status,
      timestamp: new Date().toISOString(),
      message: `New deposit: ${depositData.amount} ${depositData.currency}`
    });
  }

  // Send withdrawal notification
  notifyWithdrawal(withdrawalData) {
    this.emit('withdrawal', {
      type: 'withdrawal',
      payment_id: withdrawalData.payment_id,
      amount: withdrawalData.amount,
      currency: withdrawalData.currency,
      status: withdrawalData.status,
      timestamp: new Date().toISOString(),
      message: `Withdrawal: ${withdrawalData.amount} ${withdrawalData.currency}`
    });
  }

  // Send system notification
  notifySystem(message, level = 'info') {
    this.emit('system', {
      type: 'system',
      level: level, // info, warning, error, success
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  // Get notification history
  async getNotificationHistory(params = {}) {
    try {
      const response = await api.get('/api/notifications/history', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      await api.put('/api/notifications/read-all');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread notification count
  async getUnreadCount() {
    try {
      const response = await api.get('/api/notifications/unread-count');
      return response.data.count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Clear all notifications
  async clearAllNotifications() {
    try {
      await api.delete('/api/notifications/clear-all');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  }

  // Setup browser notifications
  setupBrowserNotifications() {
    if ('Notification' in window) {
      // Request permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.browserNotificationEnabled = true;
        }
      });
    }
  }

  // Show browser notification
  showBrowserNotification(title, options = {}) {
    if (this.browserNotificationEnabled && 'Notification' in window) {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    }
  }

  // Cleanup
  cleanup() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.subscribers.clear();
  }
}

export default new NotificationService();
