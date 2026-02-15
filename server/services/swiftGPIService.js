import axios from 'axios';
import logger from '../config/logger.js';
import { query } from '../config/database.js';

class SwiftGPIService {
  constructor() {
    this.gpiEndpoints = {
      gpiTracker: process.env.GPI_TRACKER_API || 'https://gpi.swift.com/api/v1',
      gpiDirectory: process.env.GPI_DIRECTORY_API || 'https://gpi.swift.com/directory/api/v1'
    };
    this.apiKey = process.env.SWIFT_API_KEY;
    this.timeout = 30000;
  }

  async trackPayment(utr, reference) {
    try {
      if (!this.apiKey) {
        return this.mockGpiTracking(utr, reference);
      }

      const response = await axios.get(`${this.gpiEndpoints.gpiTracker}/payments/${utr}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      await this.storeTrackingResult(utr, response.data);
      return { success: true, data: response.data };

    } catch (error) {
      logger.error('GPI tracking failed', { utr, error: error.message });
      return this.mockGpiTracking(utr, reference);
    }
  }

  async mockGpiTracking(utr, reference) {
    const mockData = {
      utr, reference,
      status: 'completed',
      sender: { bank: 'DEUTDEFFXXX', name: 'DEUTSCHE BANK AG' },
      receiver: { bank: 'CHASUS33XXX', name: 'JPMORGAN CHASE BANK' },
      amount: { value: '10000.00', currency: 'USD' },
      timestamp: new Date().toISOString()
    };

    await this.storeTrackingResult(utr, mockData);
    return { success: true, data: mockData, mock: true };
  }

  async searchBankDirectory(bic, name, country) {
    try {
      if (!this.apiKey) {
        return this.mockDirectorySearch(bic, name, country);
      }

      const params = new URLSearchParams();
      if (bic) params.append('bic', bic);
      if (name) params.append('name', name);
      if (country) params.append('country', country);

      const response = await axios.get(`${this.gpiEndpoints.gpiDirectory}/banks?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      return { success: true, data: response.data };

    } catch (error) {
      logger.error('GPI directory search failed', { bic, error: error.message });
      return this.mockDirectorySearch(bic, name, country);
    }
  }

  async mockDirectorySearch(bic, name, country) {
    const mockBanks = [
      { bic: 'DEUTDEFFXXX', name: 'DEUTSCHE BANK AG', country: 'DE', gpiMember: true },
      { bic: 'CHASUS33XXX', name: 'JPMORGAN CHASE BANK', country: 'US', gpiMember: true },
      { bic: 'BARCGB22XXX', name: 'BARCLAYS BANK UK PLC', country: 'GB', gpiMember: true }
    ];

    let results = mockBanks;
    if (bic) results = results.filter(bank => bank.bic.includes(bic.toUpperCase()));
    if (name) results = results.filter(bank => bank.name.toLowerCase().includes(name.toLowerCase()));
    if (country) results = results.filter(bank => bank.country === country.toUpperCase());

    return { success: true, data: results, mock: true };
  }

  async storeTrackingResult(utr, data) {
    try {
      await query(`
        INSERT INTO gpi_tracking (utr, tracking_data, created_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (utr) DO UPDATE SET
          tracking_data = EXCLUDED.tracking_data,
          updated_at = CURRENT_TIMESTAMP
      `, [utr, JSON.stringify(data)]);
    } catch (error) {
      logger.error('Error storing GPI tracking result', { utr, error: error.message });
    }
  }

  async getTrackingHistory(utr) {
    try {
      const result = await query(`
        SELECT * FROM gpi_tracking WHERE utr = $1 ORDER BY created_at DESC
      `, [utr]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting tracking history', { utr, error: error.message });
      return [];
    }
  }
}

export default new SwiftGPIService();
