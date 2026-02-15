import axios from 'axios';
import crypto from 'crypto';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import balanceService from './balanceService.js';

/**
 * NowPayments Crypto Payment Gateway Service
 * Handles cryptocurrency payments via NowPayments API
 * Uses unified implementation from installer configuration
 */
class NowPaymentsService {
  constructor() {
    this.apiKey = null;
    this.ipnSecret = null;
    this.payoutWallet = null;
    this.payoutCurrency = null;
    this.defaultCurrency = 'USD';
    this.baseURL = 'https://api.nowpayments.io/v1';
    this.loadConfig();
  }

  /**
   * Load configuration from system settings
   */
  async loadConfig() {
    try {
      const result = await query(
        'SELECT key, value FROM system_settings WHERE key IN ($1, $2, $3, $4, $5)',
        ['nowpayments_api_key', 'nowpayments_ipn_secret', 'nowpayments_payout_wallet', 'nowpayments_payout_currency', 'default_currency']
      );

      result.rows.forEach(row => {
        const value = JSON.parse(row.value);
        switch(row.key) {
          case 'nowpayments_api_key':
            this.apiKey = value;
            break;
          case 'nowpayments_ipn_secret':
            this.ipnSecret = value;
            break;
          case 'nowpayments_payout_wallet':
            this.payoutWallet = value;
            break;
          case 'nowpayments_payout_currency':
            this.payoutCurrency = value;
            break;
          case 'default_currency':
            this.defaultCurrency = value || 'USD';
            break;
        }
      });

      if (!this.apiKey) {
        logger.warn('NowPayments API key not configured in system settings');
      }
    } catch (error) {
      logger.error('Error loading NowPayments configuration', { error: error.message });
    }
  }

  /**
   * Create axios instance with proper headers
   */
  createInstance() {
    return axios.create({
      baseURL: this.baseURL,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create payment (Standard e-commerce flow)
   */
  async createPayment(userId, amount, currency = 'USDT') {
    try {
      if (!this.apiKey) {
        await this.loadConfig();
        if (!this.apiKey) {
          throw new Error('NowPayments API key not configured');
        }
      }

      // Generate unique order ID
      const orderId = `DEP_${userId}_${Date.now()}`;
      const orderDescription = `Deposit for user ${userId}`;
      const ipnCallbackUrl = `${process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5000'}/api/payments/ipn`;

      // Process payment using complete e-commerce flow
      const paymentResult = await this.processPayment(
        amount,
        this.defaultCurrency,
        currency,
        orderId,
        orderDescription,
        ipnCallbackUrl
      );

      // Save payment to database
      await query(`
        INSERT INTO payments (
          user_id, payment_id, order_id, amount, currency, pay_currency,
          pay_address, status, pay_amount, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `, [
        userId,
        paymentResult.payment.payment_id,
        orderId,
        amount,
        this.defaultCurrency,
        currency,
        paymentResult.payment.pay_address,
        'waiting',
        paymentResult.payment.pay_amount
      ]);

      logger.info('NowPayments payment created', { 
        userId, 
        orderId, 
        nowpaymentsId: paymentResult.payment.payment_id 
      });

      return {
        success: true,
        paymentId: orderId,
        nowpaymentsPaymentId: paymentResult.payment.payment_id,
        paymentUrl: paymentResult.payment.invoice_url,
        paymentAddress: paymentResult.payment.pay_address,
        paymentAmount: paymentResult.payment.pay_amount,
        currency: currency.toUpperCase(),
        status: paymentResult.payment.payment_status,
        estimate: paymentResult.estimate,
        minimumAmount: paymentResult.minimum_amount
      };
    } catch (error) {
      logger.error('Error creating NowPayments payment', { 
        userId, 
        amount, 
        currency, 
        error: error.message,
        response: error.response?.data 
      });
      throw new Error(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId) {
    try {
      if (!this.apiKey) {
        await this.loadConfig();
      }

      const result = await query(
        'SELECT payment_id FROM payments WHERE order_id = $1',
        [paymentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const nowpaymentsId = result.rows[0].payment_id;
      const instance = this.createInstance();
      
      const response = await instance.get(`/payment/${nowpaymentsId}`);
      const paymentData = response.data;

      // Update payment status in database
      await query(`
        UPDATE payments 
        SET status = $1, actually_paid = $2, updated_at = CURRENT_TIMESTAMP
        WHERE order_id = $3
      `, [
        paymentData.payment_status,
        parseFloat(paymentData.actually_paid || 0),
        paymentId
      ]);

      // If payment is finished, add balance to user
      if (paymentData.payment_status === 'finished') {
        const paymentResult = await query(
          'SELECT user_id, amount FROM payments WHERE order_id = $1',
          [paymentId]
        );

        if (paymentResult.rows.length > 0) {
          const { user_id, amount } = paymentResult.rows[0];
          await balanceService.creditBalance(user_id, paymentData.actually_paid || amount, this.defaultCurrency);
        }
      }

      return {
        status: paymentData.payment_status,
        actuallyPaid: parseFloat(paymentData.actually_paid || 0),
        paymentAmount: parseFloat(paymentData.pay_amount || 0)
      };
    } catch (error) {
      logger.error('Error checking payment status', { paymentId, error: error.message });
      throw error;
    }
  }

  /**
   * Handle IPN callback from NowPayments
   */
  async handleCallback(callbackData) {
    try {
      const signature = callbackData.headers?.['x-nowpayments-sig'];
      
      if (!signature) {
        throw new Error('Missing IPN signature');
      }

      // Validate IPN signature
      if (!this.validateIpnSignature(callbackData.body, signature)) {
        throw new Error('Invalid IPN signature');
      }

      const paymentData = callbackData.body;
      logger.info('Received IPN callback', { 
        payment_id: paymentData.payment_id, 
        status: paymentData.payment_status 
      });

      // Update payment in database
      await query(`
        UPDATE payments 
        SET status = $1, actually_paid = $2, outcome_amount = $3, updated_at = CURRENT_TIMESTAMP
        WHERE payment_id = $4
      `, [
        paymentData.payment_status,
        paymentData.actually_paid,
        paymentData.outcome_amount,
        paymentData.payment_id
      ]);

      // If payment is finished, credit user balance
      if (paymentData.payment_status === 'finished') {
        const paymentResult = await query(
          'SELECT user_id, amount, currency FROM payments WHERE payment_id = $1',
          [paymentData.payment_id]
        );

        if (paymentResult.rows.length > 0) {
          const payment = paymentResult.rows[0];
          await balanceService.creditBalance(
            payment.user_id, 
            paymentData.actually_paid || payment.amount, 
            payment.currency
          );
          
          logger.info('Payment completed and balance credited', {
            user_id: payment.user_id,
            amount: paymentData.actually_paid || payment.amount,
            currency: payment.currency,
            payment_id: paymentData.payment_id
          });
        }
      }

      return { success: true, status: paymentData.payment_status };
    } catch (error) {
      logger.error('Error handling NowPayments callback', { 
        error: error.message, 
        callbackData: callbackData.body 
      });
      throw error;
    }
  }

  /**
   * Get available currencies
   */
  async getAvailableCurrencies() {
    try {
      if (!this.apiKey) {
        await this.loadConfig();
      }

      const instance = this.createInstance();
      const response = await instance.get('/currencies');
      return response.data.currencies || [];
    } catch (error) {
      logger.error('Error getting currencies', { error: error.message });
      // Return default currencies if API fails
      return ['BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'BCH', 'TRX'];
    }
  }

  /**
   * Get minimum payment amount
   */
  async getMinimumAmount(currencyFrom, currencyTo) {
    try {
      const instance = this.createInstance();
      const response = await instance.get('/min-amount', {
        params: {
          currency_from: currencyFrom,
          currency_to: currencyTo
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error getting minimum amount:', error);
      throw error;
    }
  }

  /**
   * Get estimated price
   */
  async getEstimatedPrice(amount, currencyFrom, currencyTo) {
    try {
      const instance = this.createInstance();
      const response = await instance.get('/estimate', {
        params: {
          amount: amount,
          currency_from: currencyFrom,
          currency_to: currencyTo
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error getting estimated price:', error);
      throw error;
    }
  }

  /**
   * Complete e-commerce flow
   */
  async processPayment(priceAmount, priceCurrency, payCurrency, orderId, orderDescription, ipnCallbackUrl) {
    try {
      // Step 1: Check API availability
      const instance = this.createInstance();
      await instance.get('/status');

      // Step 2: Get minimum payment amount
      const minAmount = await this.getMinimumAmount(payCurrency, priceCurrency);
      
      // Step 3: Get estimated price
      const estimate = await this.getEstimatedPrice(priceAmount, payCurrency, priceCurrency);
      
      // Step 4: Check if amount meets minimum
      if (parseFloat(estimate.estimated_amount) < parseFloat(minAmount.min_amount)) {
        throw new Error(`Amount ${priceAmount} ${priceCurrency} is below minimum ${minAmount.min_amount} ${payCurrency}`);
      }

      // Step 5: Create payment
      const response = await instance.post('/payment', {
        price_amount: priceAmount,
        price_currency: priceCurrency,
        pay_currency: payCurrency,
        order_id: orderId,
        order_description: orderDescription,
        ipn_callback_url: ipnCallbackUrl
      });

      const payment = response.data;

      return {
        success: true,
        payment: payment,
        estimate: estimate,
        minimum_amount: minAmount
      };
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * IPN signature validation
   */
  validateIpnSignature(requestBody, signature) {
    if (!this.ipnSecret) {
      logger.error('IPN Secret is required for webhook validation');
      return false;
    }

    try {
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
      return expectedSignature === signature;
    } catch (error) {
      logger.error('Error validating IPN signature:', error);
      return false;
    }
  }
}

export default new NowPaymentsService();

