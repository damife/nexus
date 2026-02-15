import { query } from '../config/database.js';
import logger from '../config/logger.js';
import nowpaymentsService from './nowpaymentsService.js';

class CryptoDepositService {
  constructor() {
    // Use unified NowPayments service
    this.nowPayments = nowpaymentsService;
  }

  // Create a new deposit address for user
  async createDepositAddress(userId, cryptocurrency) {
    try {
      // Validate cryptocurrency
      const supportedCryptos = ['BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'BCH', 'TRX'];
      if (!supportedCryptos.includes(cryptocurrency.toUpperCase())) {
        throw new Error(`Unsupported cryptocurrency: ${cryptocurrency}`);
      }

      // Use unified NowPayments service to create payment
      const result = await this.nowPayments.createPayment(userId, 10, cryptocurrency);

      logger.info('Deposit address created', {
        userId,
        cryptocurrency,
        paymentId: result.paymentId,
        address: result.paymentAddress
      });

      return {
        id: result.paymentId,
        user_id: userId,
        cryptocurrency: cryptocurrency.toUpperCase(),
        deposit_address: result.paymentAddress,
        pay_amount: result.paymentAmount,
        usd_value: 10, // Default USD value
        payment_id: result.nowpaymentsPaymentId,
        status: 'waiting',
        created_at: new Date()
      };

    } catch (error) {
      logger.error('Error creating deposit address', {
        error: error.message,
        userId,
        cryptocurrency
      });
      throw error;
    }
  }

  // Get deposit status
  async getDepositStatus(depositId, userId) {
    try {
      const result = await query(`
        SELECT * FROM payments 
        WHERE order_id = $1 AND user_id = $2
      `, [depositId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Deposit not found');
      }

      return result.rows[0];

    } catch (error) {
      logger.error('Error getting deposit status', {
        error: error.message,
        depositId,
        userId
      });
      throw error;
    }
  }

  // Get all user deposits
  async getUserDeposits(userId, limit = 50, offset = 0) {
    try {
      const result = await query(`
        SELECT 
          id,
          payment_id as nowpayments_payment_id,
          order_id,
          amount,
          currency,
          pay_currency as cryptocurrency,
          pay_address as deposit_address,
          status,
          actually_paid,
          created_at,
          updated_at
        FROM payments 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      // Transform data to match expected format
      return result.rows.map(row => ({
        ...row,
        usd_value: row.amount,
        tx_hash: row.payment_id,
        confirmed_at: row.status === 'finished' ? row.updated_at : null
      }));

    } catch (error) {
      logger.error('Error getting user deposits', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Process IPN callback from NowPayments
  async processIPNCallback(callbackData) {
    try {
      // Use unified NowPayments service for IPN handling
      const result = await this.nowPayments.handleCallback({
        body: callbackData,
        headers: {
          'x-nowpayments-sig': callbackData.signature
        }
      });

      logger.info('IPN callback processed', {
        payment_id: callbackData.payment_id,
        status: callbackData.payment_status,
        result
      });

      return result;

    } catch (error) {
      logger.error('Error processing IPN callback', {
        error: error.message,
        callbackData
      });
      throw error;
    }
  }

  // Get supported cryptocurrencies
  getSupportedCryptocurrencies() {
    return [
      { symbol: 'BTC', name: 'Bitcoin', minDeposit: 0.0001 },
      { symbol: 'ETH', name: 'Ethereum', minDeposit: 0.01 },
      { symbol: 'USDT', name: 'Tether', minDeposit: 10 },
      { symbol: 'USDC', name: 'USD Coin', minDeposit: 10 },
      { symbol: 'LTC', name: 'Litecoin', minDeposit: 0.01 },
      { symbol: 'BCH', name: 'Bitcoin Cash', minDeposit: 0.01 },
      { symbol: 'TRX', name: 'TRON', minDeposit: 10 }
    ];
  }
}

export default new CryptoDepositService();
