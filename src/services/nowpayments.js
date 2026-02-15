import axios from 'axios';
import crypto from 'crypto';

class NowPaymentsService {
  constructor(apiKey, ipnSecret = null) {
    this.apiKey = apiKey;
    this.ipnSecret = ipnSecret;
    this.baseURL = 'https://api.nowpayments.io/v1';
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minInterval = 100; // Rate limiting: 100ms between requests
  }

  // Create axios instance with proper headers and retry logic
  createInstance() {
    const instance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Add response interceptor for retry logic
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        // Don't retry if it's a 4xx error (except 429)
        if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
          throw error;
        }

        // Don't retry if we've already retried too many times
        if (!config || !config.retry || config.__retryCount >= config.retry) {
          throw error;
        }

        // Set retry count
        config.__retryCount = config.__retryCount || 0;
        config.__retryCount += 1;

        // Calculate delay with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, config.__retryCount - 1), 10000);
        
        console.warn(`Retrying request (attempt ${config.__retryCount}/${config.retry}) after ${delay}ms`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return instance(config);
      }
    );

    return instance;
  }

  // Rate limiting wrapper
  async makeRequest(requestFn) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
    return requestFn();
  }

  // Enhanced API call with retry logic
  async apiCall(method, endpoint, data = null, params = null, maxRetries = 3) {
    const instance = this.createInstance();
    const config = { retry: maxRetries };
    
    const requestFn = () => {
      switch (method.toLowerCase()) {
        case 'get':
          return instance.get(endpoint, { ...config, params });
        case 'post':
          return instance.post(endpoint, data, config);
        case 'put':
          return instance.put(endpoint, data, config);
        case 'delete':
          return instance.delete(endpoint, config);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    };

    return this.makeRequest(requestFn);
  }

  // 1. Check API availability with retry logic
  async getApiStatus() {
    try {
      const response = await this.apiCall('GET', '/status');
      return response.data;
    } catch (error) {
      console.error('Error checking API status:', error);
      throw error;
    }
  }

  // 2. Get available currencies with retry logic
  async getAvailableCurrencies() {
    try {
      const response = await this.apiCall('GET', '/currencies');
      return response.data;
    } catch (error) {
      console.error('Error getting available currencies:', error);
      throw error;
    }
  }

  // 3. Get minimum payment amount with retry logic
  async getMinimumAmount(currencyFrom, currencyTo) {
    try {
      const response = await this.apiCall('GET', '/min-amount', null, {
        currency_from: currencyFrom,
        currency_to: currencyTo
      });
      return response.data;
    } catch (error) {
      console.error('Error getting minimum amount:', error);
      throw error;
    }
  }

  // 4. Get real-time estimated price with retry logic
  async getEstimatedPrice(amount, currencyFrom, currencyTo) {
    try {
      const response = await this.apiCall('GET', '/estimate', null, {
        amount: amount,
        currency_from: currencyFrom,
        currency_to: currencyTo
      });
      return response.data;
    } catch (error) {
      console.error('Error getting estimated price:', error);
      throw error;
    }
  }

  // 5. Get real-time exchange rate
  async getRealTimeExchangeRate(fromCurrency, toCurrency) {
    try {
      const response = await this.apiCall('GET', '/estimate', null, {
        amount: 1,
        currency_from: fromCurrency,
        currency_to: toCurrency
      });
      return parseFloat(response.data.estimated_amount);
    } catch (error) {
      console.error('Failed to get exchange rate:', error);
      throw error;
    }
  }

  // 5. Create payment (Standard e-commerce flow) with retry logic
  async createPayment(priceAmount, priceCurrency, payCurrency, orderId, orderDescription, ipnCallbackUrl) {
    try {
      const response = await this.apiCall('POST', '/payment', {
        price_amount: priceAmount,
        price_currency: priceCurrency,
        pay_currency: payCurrency,
        order_id: orderId,
        order_description: orderDescription,
        ipn_callback_url: ipnCallbackUrl
      });
      return response.data;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  // Alternative: Create Invoice
  async createInvoice(priceAmount, priceCurrency, payCurrency, orderId, orderDescription, successUrl, ipnCallbackUrl) {
    try {
      const instance = this.createInstance();
      const response = await instance.post('/invoice', {
        price_amount: priceAmount,
        price_currency: priceCurrency,
        pay_currency: payCurrency,
        order_id: orderId,
        order_description: orderDescription,
        success_url: successUrl,
        ipn_callback_url: ipnCallbackUrl
      });
      return response.data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  // 6. Get payment status with retry logic
  async getPaymentStatus(paymentId) {
    try {
      const response = await this.apiCall('GET', `/payment/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  // 7. Get list of payments with retry logic
  async getPaymentsList(limit = 10, page = 1, status = null, dateFrom = null, dateTo = null) {
    try {
      const params = { limit, page };
      if (status) params.status = status;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await this.apiCall('GET', '/payment', null, params);
      return response.data;
    } catch (error) {
      console.error('Error getting payments list:', error);
      throw error;
    }
  }

  // Enhanced IPN Webhook Validation with timestamp
  validateIpnSignature(requestBody, signature, timestamp = null) {
    if (!this.ipnSecret) {
      throw new Error('IPN Secret is required for webhook validation');
    }

    try {
      // Check timestamp to prevent replay attacks (if provided)
      if (timestamp) {
        const now = Date.now();
        const timestampMs = parseInt(timestamp) * 1000; // Convert to milliseconds
        const timeDiff = Math.abs(now - timestampMs);
        
        // Reject if timestamp is older than 5 minutes or more than 5 minutes in future
        if (timeDiff > 300000) {
          console.error('IPN timestamp validation failed - timestamp too old or in future');
          return false;
        }
      }

      // Sort the object by keys
      const sortObject = (obj) => {
        return Object.keys(obj).sort().reduce((result, key) => {
          result[key] = (obj[key] && typeof obj[key] === 'object') ? sortObject(obj[key]) : obj[key];
          return result;
        }, {});
      };

      // Create sorted JSON string
      const sortedParams = sortObject(requestBody);
      const sortedJsonString = JSON.stringify(sortedParams);

      // Create HMAC SHA-512 signature
      const hmac = crypto.createHmac('sha512', this.ipnSecret);
      hmac.update(sortedJsonString);
      const expectedSignature = hmac.digest('hex');

      // Compare signatures
      const isValid = expectedSignature === signature;
      
      if (!isValid) {
        console.error('IPN signature validation failed');
      }

      return isValid;
    } catch (error) {
      console.error('Error validating IPN signature:', error);
      return false;
    }
  }

  // Complete e-commerce flow
  async processPayment(priceAmount, priceCurrency, payCurrency, orderId, orderDescription, ipnCallbackUrl) {
    try {
      // Step 1: Check API availability
      await this.getApiStatus();

      // Step 2: Get available currencies (optional)
      // await this.getAvailableCurrencies();

      // Step 3: Get minimum payment amount
      const minAmount = await this.getMinimumAmount(payCurrency, priceCurrency);
      
      // Step 4: Get estimated price
      const estimate = await this.getEstimatedPrice(priceAmount, payCurrency, priceCurrency);
      
      // Step 5: Check if amount meets minimum
      if (parseFloat(estimate.estimated_amount) < parseFloat(minAmount.min_amount)) {
        throw new Error(`Amount ${priceAmount} ${priceCurrency} is below minimum ${minAmount.min_amount} ${payCurrency}`);
      }

      // Step 6: Create payment
      const payment = await this.createPayment(
        priceAmount,
        priceCurrency,
        payCurrency,
        orderId,
        orderDescription,
        ipnCallbackUrl
      );

      return {
        success: true,
        payment: payment,
        estimate: estimate,
        minimum_amount: minAmount
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  // Smart currency suggestions based on amount and network fees
  async suggestOptimalCurrency(amountUSD) {
    try {
      const currencies = await this.getAvailableCurrencies();
      const suggestions = [];
      
      // Network fee estimates (in USD)
      const networkFees = {
        'BTC': 5.0,    // High fees
        'ETH': 2.5,    // Medium fees  
        'USDT': 1.0,   // Low fees
        'USDC': 1.0,   // Low fees
        'LTC': 0.5,    // Low fees
        'BCH': 0.5,    // Low fees
        'TRX': 0.1     // Very low fees
      };
      
      // Confirmation time estimates (in minutes)
      const confirmationTimes = {
        'BTC': 60,     // Slow
        'ETH': 15,     // Medium
        'USDT': 5,     // Fast
        'USDC': 5,     // Fast
        'LTC': 30,     // Medium
        'BCH': 30,     // Medium
        'TRX': 2       // Very fast
      };
      
      for (const currency of currencies.currencies || []) {
        try {
          const estimate = await this.getEstimatedPrice(amountUSD, currency, 'USD');
          const minAmount = await this.getMinimumAmount(currency, 'USD');
          
          if (parseFloat(estimate.estimated_amount) >= parseFloat(minAmount.min_amount)) {
            suggestions.push({
              currency: currency,
              estimatedAmount: parseFloat(estimate.estimated_amount),
              networkFee: networkFees[currency] || 1.0,
              confirmationTime: confirmationTimes[currency] || 30,
              efficiency: this.calculateEfficiency(currency, parseFloat(estimate.estimated_amount), networkFees[currency] || 1.0)
            });
          }
        } catch (error) {
          continue; // Skip currencies that fail
        }
      }
      
      // Sort by efficiency (best value first)
      return suggestions.sort((a, b) => b.efficiency - a.efficiency);
    } catch (error) {
      console.error('Error getting currency suggestions:', error);
      return [];
    }
  }
  
  // Calculate efficiency score for currency selection
  calculateEfficiency(currency, amount, fee) {
    // Higher score for lower fees and faster confirmation
    const feeScore = Math.max(0, 100 - fee); // Lower fee = higher score
    const timeScore = Math.max(0, 100 - (this.getConfirmationTime(currency) / 60 * 20)); // Faster = higher score
    return (feeScore + timeScore) / 2;
  }
  
  getConfirmationTime(currency) {
    const times = { 'BTC': 60, 'ETH': 15, 'USDT': 5, 'USDC': 5, 'LTC': 30, 'BCH': 30, 'TRX': 2 };
    return times[currency] || 30;
  }

  // Get payment statistics with analytics
  async getPaymentStats(timeframe = '7d') {
    try {
      const response = await this.apiCall('GET', '/payment', null, {
        limit: 100,
        date_from: this.getDateFromTimeframe(timeframe),
        date_to: new Date().toISOString().split('T')[0]
      });
      
      const payments = response.data;
      
      return {
        total: payments.length,
        finished: payments.filter(p => p.payment_status === 'finished').length,
        pending: payments.filter(p => p.payment_status === 'waiting' || p.payment_status === 'confirming').length,
        failed: payments.filter(p => p.payment_status === 'failed' || p.payment_status === 'expired').length,
        total_amount: payments.reduce((sum, p) => sum + (parseFloat(p.price_amount) || 0), 0),
        average_amount: payments.length > 0 ? payments.reduce((sum, p) => sum + (parseFloat(p.price_amount) || 0), 0) / payments.length : 0,
        by_currency: this.groupByCurrency(payments),
        by_status: this.groupByStatus(payments),
        timeframe: timeframe
      };
    } catch (error) {
      console.error('Error getting payment stats:', error);
      throw error;
    }
  }
  
  groupByCurrency(payments) {
    return payments.reduce((acc, payment) => {
      const currency = payment.pay_currency || 'Unknown';
      acc[currency] = (acc[currency] || 0) + 1;
      return acc;
    }, {});
  }
  
  groupByStatus(payments) {
    return payments.reduce((acc, payment) => {
      const status = payment.payment_status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }
  
  getDateFromTimeframe(timeframe) {
    const date = new Date();
    switch (timeframe) {
      case '1d': date.setDate(date.getDate() - 1); break;
      case '7d': date.setDate(date.getDate() - 7); break;
      case '30d': date.setDate(date.getDate() - 30); break;
      case '90d': date.setDate(date.getDate() - 90); break;
      default: date.setDate(date.getDate() - 7);
    }
    return date.toISOString().split('T')[0];
  }
}

export default NowPaymentsService;
