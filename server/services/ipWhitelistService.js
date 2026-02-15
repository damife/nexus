import { query } from '../config/database.js';
import logger from '../config/logger.js';

class IPWhitelistService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes cache
  }

  /**
   * Get IP whitelist for a user
   */
  async getWhitelist(userId) {
    try {
      const cacheKey = `whitelist_${userId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const result = await query(`
        SELECT 
          id,
          ip_address,
          ip_range,
          description,
          is_active,
          created_at,
          updated_at
        FROM ip_whitelist
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `, [userId]);

      const whitelist = result.rows.map(row => ({
        id: row.id,
        ipAddress: row.ip_address,
        ipRange: row.ip_range,
        description: row.description,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      this.cache.set(cacheKey, {
        data: whitelist,
        timestamp: Date.now()
      });

      return whitelist;
    } catch (error) {
      logger.error('Error getting IP whitelist', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add IP to whitelist
   */
  async addToWhitelist(userId, ipAddress, description = '') {
    try {
      // Validate IP address format
      if (!this.isValidIP(ipAddress)) {
        throw new Error('Invalid IP address format');
      }

      // Check if IP already exists
      const existingResult = await query(`
        SELECT id FROM ip_whitelist 
        WHERE user_id = $1 AND ip_address = $2
      `, [userId, ipAddress]);

      if (existingResult.rows.length > 0) {
        throw new Error('IP address already exists in whitelist');
      }

      // Add to whitelist
      const result = await query(`
        INSERT INTO ip_whitelist (user_id, ip_address, ip_range, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [userId, ipAddress, this.getIPRange(ipAddress), description]);

      // Clear cache
      this.cache.delete(`whitelist_${userId}`);

      logger.info('IP added to whitelist', {
        userId,
        ipAddress,
        description
      });

      return {
        id: result.rows[0].id,
        ipAddress: result.rows[0].ip_address,
        ipRange: result.rows[0].ip_range,
        description: result.rows[0].description,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at
      };
    } catch (error) {
      logger.error('Error adding IP to whitelist', {
        userId,
        ipAddress,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Remove IP from whitelist
   */
  async removeFromWhitelist(userId, whitelistId) {
    try {
      const result = await query(`
        UPDATE ip_whitelist 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [whitelistId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Whitelist entry not found');
      }

      // Clear cache
      this.cache.delete(`whitelist_${userId}`);

      logger.info('IP removed from whitelist', {
        userId,
        whitelistId
      });

      return true;
    } catch (error) {
      logger.error('Error removing IP from whitelist', {
        userId,
        whitelistId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if IP is whitelisted for user
   */
  async isIPWhitelisted(userId, clientIP) {
    try {
      const whitelist = await this.getWhitelist(userId);
      
      if (whitelist.length === 0) {
        // No whitelist configured - allow all IPs
        return { allowed: true, reason: 'No whitelist configured' };
      }

      // Check exact match
      const exactMatch = whitelist.find(entry => entry.ipAddress === clientIP);
      if (exactMatch) {
        return { allowed: true, reason: 'Exact IP match' };
      }

      // Check range match
      const rangeMatch = whitelist.find(entry => this.isIPInRange(clientIP, entry.ipRange));
      if (rangeMatch) {
        return { allowed: true, reason: 'IP range match' };
      }

      return { allowed: false, reason: 'IP not whitelisted' };
    } catch (error) {
      logger.error('Error checking IP whitelist', {
        userId,
        clientIP,
        error: error.message
      });
      // On error, allow access (fail open)
      return { allowed: true, reason: 'Error checking whitelist' };
    }
  }

  /**
   * Get IP access logs
   */
  async getAccessLogs(userId, limit = 50) {
    try {
      const result = await query(`
        SELECT 
          ip_address,
          user_agent,
          access_granted,
          reason,
          created_at
        FROM ip_access_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows.map(row => ({
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        accessGranted: row.access_granted,
        reason: row.reason,
        timestamp: row.created_at
      }));
    } catch (error) {
      logger.error('Error getting access logs', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Log IP access attempt
   */
  async logAccessAttempt(userId, ipAddress, userAgent, accessGranted, reason) {
    try {
      await query(`
        INSERT INTO ip_access_logs (user_id, ip_address, user_agent, access_granted, reason, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [userId, ipAddress, userAgent, accessGranted, reason]);
    } catch (error) {
      logger.error('Error logging access attempt', {
        userId,
        ipAddress,
        accessGranted,
        error: error.message
      });
      // Don't throw error for logging failures
    }
  }

  /**
   * Validate IP address format
   */
  isValidIP(ip) {
    try {
      // IPv4 validation
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      
      // IPv6 validation (simplified)
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      
      return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get IP range for CIDR notation
   */
  getIPRange(ip) {
    try {
      // For single IP, return /32
      if (ip.includes('/')) {
        return ip;
      }
      return `${ip}/32`;
    } catch (error) {
      return `${ip}/32`;
    }
  }

  /**
   * Check if IP is in range
   */
  isIPInRange(ip, range) {
    try {
      if (!range.includes('/')) {
        return ip === range;
      }

      const [rangeIP, prefixLength] = range.split('/');
      const prefix = parseInt(prefixLength);

      // Simple implementation for IPv4 /24, /16, /8 ranges
      if (prefix === 24) {
        const ipParts = ip.split('.');
        const rangeParts = rangeIP.split('.');
        return ipParts[0] === rangeParts[0] && 
               ipParts[1] === rangeParts[1] && 
               ipParts[2] === rangeParts[2];
      } else if (prefix === 16) {
        const ipParts = ip.split('.');
        const rangeParts = rangeIP.split('.');
        return ipParts[0] === rangeParts[0] && 
               ipParts[1] === rangeParts[1];
      } else if (prefix === 8) {
        const ipParts = ip.split('.');
        const rangeParts = rangeIP.split('.');
        return ipParts[0] === rangeParts[0];
      } else if (prefix === 32) {
        return ip === rangeIP;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get client IP from request
   */
  getClientIP(req) {
    try {
      return req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
             req.ip;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear cache for user
   */
  clearCache(userId) {
    this.cache.delete(`whitelist_${userId}`);
  }

  /**
   * Get whitelist statistics
   */
  async getWhitelistStats(userId) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(*) FILTER (WHERE is_active = true) as active_entries,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_entries
        FROM ip_whitelist
        WHERE user_id = $1
      `, [userId]);

      const logsResult = await query(`
        SELECT 
          COUNT(*) as total_attempts,
          COUNT(*) FILTER (WHERE access_granted = true) as successful_attempts,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as recent_attempts
        FROM ip_access_logs
        WHERE user_id = $1
      `, [userId]);

      return {
        totalEntries: parseInt(result.rows[0].total_entries) || 0,
        activeEntries: parseInt(result.rows[0].active_entries) || 0,
        recentEntries: parseInt(result.rows[0].recent_entries) || 0,
        totalAttempts: parseInt(logsResult.rows[0].total_attempts) || 0,
        successfulAttempts: parseInt(logsResult.rows[0].successful_attempts) || 0,
        recentAttempts: parseInt(logsResult.rows[0].recent_attempts) || 0
      };
    } catch (error) {
      logger.error('Error getting whitelist stats', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
}

export default new IPWhitelistService();
