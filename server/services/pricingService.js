import { query } from '../config/database.js';
import logger from '../config/logger.js';

class PricingService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  // Get current pricing for a message type
  async getCurrentPricing(messageType, currency = 'USD', volume = 0) {
    try {
      const cacheKey = `${messageType}_${currency}_${volume}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Get base pricing
      const result = await query(`
        SELECT 
          id,
          message_type,
          amount,
          currency,
          volume_threshold,
          discount_percentage,
          effective_date,
          expires_date
        FROM fees 
        WHERE message_type = $1 
          AND currency = $2
          AND (effective_date IS NULL OR effective_date <= CURRENT_TIMESTAMP)
          AND (expires_date IS NULL OR expires_date > CURRENT_TIMESTAMP)
        ORDER BY volume_threshold DESC
        LIMIT 1
      `, [messageType, currency]);

      if (result.rows.length === 0) {
        throw new Error(`Pricing not found for message type: ${messageType}`);
      }

      let pricing = result.rows[0];
      
      // Apply volume discount if applicable
      if (volume > pricing.volume_threshold) {
        pricing.discounted_amount = pricing.amount * (1 - pricing.discount_percentage / 100);
      } else {
        pricing.discounted_amount = pricing.amount;
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: pricing,
        timestamp: Date.now()
      });

      return pricing;

    } catch (error) {
      logger.error('Error getting current pricing', {
        error: error.message,
        messageType,
        currency,
        volume
      });
      throw error;
    }
  }

  // Update pricing for a message type
  async updatePricing(messageType, pricingData, userId) {
    try {
      const {
        amount,
        currency = 'USD',
        volume_threshold = 0,
        discount_percentage = 0,
        effective_date = null,
        expires_date = null,
        change_reason = ''
      } = pricingData;

      // Get current pricing for history
      const currentResult = await query(`
        SELECT amount, currency FROM fees 
        WHERE message_type = $1 AND currency = $2
        ORDER BY created_at DESC LIMIT 1
      `, [messageType, currency]);

      const currentPricing = currentResult.rows[0];

      // Start transaction
      await query('BEGIN');

      try {
        // Update existing pricing or create new one
        const updateResult = await query(`
          INSERT INTO fees (
            message_type, amount, currency, volume_threshold, 
            discount_percentage, effective_date, expires_date, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
          ON CONFLICT (message_type, currency) 
          DO UPDATE SET
            amount = EXCLUDED.amount,
            volume_threshold = EXCLUDED.volume_threshold,
            discount_percentage = EXCLUDED.discount_percentage,
            effective_date = EXCLUDED.effective_date,
            expires_date = EXCLUDED.expires_date,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `, [
          messageType,
          amount,
          currency,
          volume_threshold,
          discount_percentage,
          effective_date,
          expires_date
        ]);

        // Create pricing history record
        if (currentPricing) {
          await query(`
            INSERT INTO pricing_history (
              message_type, old_amount, new_amount, currency,
              changed_by, change_reason, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          `, [
            messageType,
            currentPricing.amount,
            amount,
            currency,
            userId,
            change_reason
          ]);
        }

        await query('COMMIT');

        // Clear cache
        this.clearCache();

        logger.info('Pricing updated successfully', {
          messageType,
          currency,
          oldAmount: currentPricing?.amount,
          newAmount: amount,
          userId
        });

        return updateResult.rows[0];

      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      logger.error('Error updating pricing', {
        error: error.message,
        messageType,
        pricingData,
        userId
      });
      throw error;
    }
  }

  // Get all pricing configurations
  async getAllPricing() {
    try {
      const result = await query(`
        SELECT 
          id,
          message_type,
          amount,
          currency,
          volume_threshold,
          discount_percentage,
          effective_date,
          expires_date,
          created_at,
          updated_at
        FROM fees 
        ORDER BY message_type, currency, volume_threshold
      `);

      return result.rows;

    } catch (error) {
      logger.error('Error getting all pricing', {
        error: error.message
      });
      throw error;
    }
  }

  // Get pricing history for a message type
  async getPricingHistory(messageType, currency = null) {
    try {
      let queryStr = `
        SELECT 
          id,
          message_type,
          old_amount,
          new_amount,
          currency,
          changed_by,
          change_reason,
          created_at
        FROM pricing_history 
        WHERE message_type = $1
      `;
      
      const params = [messageType];

      if (currency) {
        queryStr += ' AND currency = $2';
        params.push(currency);
      }

      queryStr += ' ORDER BY created_at DESC';

      const result = await query(queryStr, params);

      return result.rows;

    } catch (error) {
      logger.error('Error getting pricing history', {
        error: error.message,
        messageType,
        currency
      });
      throw error;
    }
  }

  // Schedule future pricing changes
  async schedulePricingChange(messageType, pricingData, userId) {
    try {
      const {
        amount,
        currency = 'USD',
        volume_threshold = 0,
        discount_percentage = 0,
        effective_date,
        expires_date,
        change_reason = 'Scheduled pricing change'
      } = pricingData;

      if (!effective_date) {
        throw new Error('Effective date is required for scheduled changes');
      }

      // Validate that effective_date is in the future
      if (new Date(effective_date) <= new Date()) {
        throw new Error('Effective date must be in the future');
      }

      // Create scheduled pricing record
      const result = await query(`
        INSERT INTO fees (
          message_type, amount, currency, volume_threshold,
          discount_percentage, effective_date, expires_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        messageType,
        amount,
        currency,
        volume_threshold,
        discount_percentage,
        effective_date,
        expires_date
      ]);

      logger.info('Pricing change scheduled', {
        messageType,
        currency,
        effective_date,
        amount,
        userId
      });

      return result.rows[0];

    } catch (error) {
      logger.error('Error scheduling pricing change', {
        error: error.message,
        messageType,
        pricingData,
        userId
      });
      throw error;
    }
  }

  // Get scheduled pricing changes
  async getScheduledChanges() {
    try {
      const result = await query(`
        SELECT 
          id,
          message_type,
          amount,
          currency,
          volume_threshold,
          discount_percentage,
          effective_date,
          expires_date,
          created_at
        FROM fees 
        WHERE effective_date > CURRENT_TIMESTAMP
        ORDER BY effective_date ASC
      `);

      return result.rows;

    } catch (error) {
      logger.error('Error getting scheduled changes', {
        error: error.message
      });
      throw error;
    }
  }

  // Calculate fee with priority multiplier
  async calculateFee(messageType, priority = 'normal', currency = 'USD', volume = 0) {
    try {
      const pricing = await this.getCurrentPricing(messageType, currency, volume);
      
      // Apply priority multiplier
      const multipliers = {
        normal: 1,
        urgent: 2,
        system: 3
      };

      const multiplier = multipliers[priority] || 1;
      const baseFee = pricing.discounted_amount || pricing.amount;
      const finalFee = baseFee * multiplier;

      return {
        baseFee,
        multiplier,
        finalFee,
        currency,
        priority,
        messageType,
        pricing
      };

    } catch (error) {
      logger.error('Error calculating fee', {
        error: error.message,
        messageType,
        priority,
        currency,
        volume
      });
      throw error;
    }
  }

  // Get pricing statistics
  async getPricingStatistics() {
    try {
      const result = await query(`
        SELECT 
          COUNT(DISTINCT message_type) as unique_message_types,
          COUNT(DISTINCT currency) as unique_currencies,
          COUNT(*) as total_pricing_rules,
          AVG(amount) as average_fee,
          MIN(amount) as minimum_fee,
          MAX(amount) as maximum_fee
        FROM fees 
        WHERE (expires_date IS NULL OR expires_date > CURRENT_TIMESTAMP)
      `);

      const byMessageType = await query(`
        SELECT 
          message_type,
          COUNT(*) as rule_count,
          AVG(amount) as avg_fee,
          MIN(amount) as min_fee,
          MAX(amount) as max_fee
        FROM fees 
        WHERE (expires_date IS NULL OR expires_date > CURRENT_TIMESTAMP)
        GROUP BY message_type
        ORDER BY message_type
      `);

      return {
        summary: result.rows[0],
        byMessageType: byMessageType.rows
      };

    } catch (error) {
      logger.error('Error getting pricing statistics', {
        error: error.message
      });
      throw error;
    }
  }

  // Delete pricing configuration
  async deletePricing(messageType, currency = 'USD', userId) {
    try {
      const result = await query(`
        DELETE FROM fees 
        WHERE message_type = $1 AND currency = $2
        RETURNING *
      `, [messageType, currency]);

      if (result.rows.length === 0) {
        throw new Error('Pricing configuration not found');
      }

      // Clear cache
      this.clearCache();

      logger.info('Pricing deleted', {
        messageType,
        currency,
        userId
      });

      return result.rows[0];

    } catch (error) {
      logger.error('Error deleting pricing', {
        error: error.message,
        messageType,
        currency,
        userId
      });
      throw error;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get supported message types
  getSupportedMessageTypes() {
    return [
      'MT101',
      'MT102',
      'MT103',
      'MT202',
      'MT204',
      'MT210',
      'MT700',
      'MT710',
      'pacs.008',
      'pacs.009',
      'pacs.010'
    ];
  }

  // Get supported currencies
  getSupportedCurrencies() {
    return [
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'CHF',
      'CAD',
      'AUD'
    ];
  }
}

export default new PricingService();
