import { query } from '../config/database.js';
import logger from '../config/logger.js';

class MessageStatusService {
  constructor() {
    // SWIFT GPI Status Trail based on industry standards
    this.statusTrail = {
      'draft': {
        order: 1,
        label: 'Draft',
        description: 'Message saved as draft',
        color: 'gray',
        icon: 'bi-file-earmark-text'
      },
      'pending': {
        order: 2,
        label: 'Pending',
        description: 'Message queued for sending',
        color: 'yellow',
        icon: 'bi-clock'
      },
      'sent': {
        order: 3,
        label: 'Sent',
        description: 'Message sent to SWIFT network',
        color: 'blue',
        icon: 'bi-send'
      },
      'acknowledged': {
        order: 4,
        label: 'Acknowledged',
        description: 'Message acknowledged by receiving bank',
        color: 'indigo',
        icon: 'bi-check-circle'
      },
      'processing': {
        order: 5,
        label: 'Processing',
        description: 'Message being processed by receiving bank',
        color: 'orange',
        icon: 'bi-gear'
      },
      'completed': {
        order: 6,
        label: 'Completed',
        description: 'Transaction completed successfully',
        color: 'green',
        icon: 'bi-check-circle-fill'
      },
      'failed': {
        order: 7,
        label: 'Failed',
        description: 'Message processing failed',
        color: 'red',
        icon: 'bi-x-circle'
      },
      'rejected': {
        order: 8,
        label: 'Rejected',
        description: 'Message rejected by receiving bank',
        color: 'red',
        icon: 'bi-x-circle-fill'
      },
      'cancelled': {
        order: 9,
        label: 'Cancelled',
        description: 'Message cancelled by sender',
        color: 'gray',
        icon: 'bi-x-square'
      }
    };
  }

  /**
   * Create message status trail
   */
  async createStatusTrail(messageId, initialStatus = 'draft', metadata = {}) {
    try {
      const statusInfo = this.statusTrail[initialStatus];
      if (!statusInfo) {
        throw new Error(`Invalid status: ${initialStatus}`);
      }

      const result = await query(`
        INSERT INTO message_status_trail 
        (message_id, status, status_label, description, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        messageId,
        initialStatus,
        statusInfo.label,
        statusInfo.description,
        JSON.stringify(metadata)
      ]);

      logger.info('Status trail created', { 
        messageId, 
        status: initialStatus,
        trailId: result.rows[0].id
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating status trail', {
        messageId,
        status: initialStatus,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update message status
   */
  async updateStatus(messageId, newStatus, metadata = {}) {
    try {
      const statusInfo = this.statusTrail[newStatus];
      if (!statusInfo) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      // Get current status to prevent invalid transitions
      const currentStatusResult = await query(`
        SELECT status FROM message_status_trail 
        WHERE message_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [messageId]);

      const currentStatus = currentStatusResult.rows[0]?.status;

      // Validate status transition
      if (!this.isValidTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      }

      // Update message status
      await query(`
        UPDATE messages 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newStatus, messageId]);

      // Add to status trail
      const trailResult = await query(`
        INSERT INTO message_status_trail 
        (message_id, status, status_label, description, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        messageId,
        newStatus,
        statusInfo.label,
        statusInfo.description,
        JSON.stringify(metadata)
      ]);

      logger.info('Message status updated', {
        messageId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        trailId: trailResult.rows[0].id
      });

      return trailResult.rows[0];
    } catch (error) {
      logger.error('Error updating message status', {
        messageId,
        newStatus,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get complete status trail for a message
   */
  async getStatusTrail(messageId) {
    try {
      const result = await query(`
        SELECT 
          id,
          status,
          status_label,
          description,
          metadata,
          created_at
        FROM message_status_trail 
        WHERE message_id = $1 
        ORDER BY created_at ASC
      `, [messageId]);

      const trail = result.rows.map(entry => ({
        ...entry,
        metadata: JSON.parse(entry.metadata || '{}'),
        statusInfo: this.statusTrail[entry.status]
      }));

      return trail;
    } catch (error) {
      logger.error('Error fetching status trail', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get current status of a message
   */
  async getCurrentStatus(messageId) {
    try {
      const result = await query(`
        SELECT 
          m.status,
          m.updated_at,
          st.status_label,
          st.description,
          st.metadata
        FROM messages m
        LEFT JOIN message_status_trail st ON m.id = st.message_id
        WHERE m.id = $1 
        ORDER BY st.created_at DESC 
        LIMIT 1
      `, [messageId]);

      if (result.rows.length === 0) {
        return null;
      }

      const status = result.rows[0];
      return {
        ...status,
        metadata: JSON.parse(status.metadata || '{}'),
        statusInfo: this.statusTrail[status.status]
      };
    } catch (error) {
      logger.error('Error getting current status', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate status transition
   */
  isValidTransition(fromStatus, toStatus) {
    // Allow any transition from draft
    if (fromStatus === 'draft') {
      return ['pending', 'cancelled'].includes(toStatus);
    }

    // Allow transitions from pending
    if (fromStatus === 'pending') {
      return ['sent', 'cancelled', 'failed'].includes(toStatus);
    }

    // Allow transitions from sent
    if (fromStatus === 'sent') {
      return ['acknowledged', 'rejected', 'failed'].includes(toStatus);
    }

    // Allow transitions from acknowledged
    if (fromStatus === 'acknowledged') {
      return ['processing', 'rejected', 'failed'].includes(toStatus);
    }

    // Allow transitions from processing
    if (fromStatus === 'processing') {
      return ['completed', 'failed', 'rejected'].includes(toStatus);
    }

    // Final statuses - no further transitions
    const finalStatuses = ['completed', 'failed', 'rejected', 'cancelled'];
    if (finalStatuses.includes(fromStatus)) {
      return false;
    }

    return false;
  }

  /**
   * Process SWIFT ACK/NAK messages
   */
  async processAckMessage(originalUtr, ackData) {
    try {
      // Find message by UTR
      const messageResult = await query(`
        SELECT id FROM messages WHERE utr = $1
      `, [originalUtr]);

      if (messageResult.rows.length === 0) {
        throw new Error(`Message not found for UTR: ${originalUtr}`);
      }

      const messageId = messageResult.rows[0].id;

      // Process ACK (acknowledgment)
      if (ackData.type === 'ACK') {
        await this.updateStatus(messageId, 'acknowledged', {
          ackType: 'ACK',
          receivedAt: new Date().toISOString(),
          ackData: ackData
        });
      }
      // Process NAK (negative acknowledgment)
      else if (ackData.type === 'NAK') {
        await this.updateStatus(messageId, 'rejected', {
          ackType: 'NAK',
          reason: ackData.reason,
          errorCode: ackData.errorCode,
          receivedAt: new Date().toISOString(),
          ackData: ackData
        });
      }

      logger.info('ACK/NAK processed', {
        originalUtr,
        messageId,
        ackType: ackData.type
      });

      return { success: true, messageId };
    } catch (error) {
      logger.error('Error processing ACK message', {
        originalUtr,
        ackData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Simulate GPI status updates
   */
  async simulateGpiUpdate(messageId, gpiData) {
    try {
      const currentStatus = await this.getCurrentStatus(messageId);
      
      if (!currentStatus) {
        throw new Error('Message not found');
      }

      // Process GPI status updates
      switch (gpiData.status) {
        case 'ACSP':
          // Accepted by processing bank
          if (currentStatus.status === 'acknowledged') {
            await this.updateStatus(messageId, 'processing', {
              gpiStatus: 'ACSP',
              gpiData: gpiData
            });
          }
          break;

        case 'ACCC':
          // Completed
          if (currentStatus.status === 'processing') {
            await this.updateStatus(messageId, 'completed', {
              gpiStatus: 'ACCC',
              gpiData: gpiData,
              completedAt: new Date().toISOString()
            });
          }
          break;

        case 'RJCT':
          // Rejected
          await this.updateStatus(messageId, 'rejected', {
            gpiStatus: 'RJCT',
            gpiData: gpiData,
            reason: gpiData.reason
          });
          break;
      }

      logger.info('GPI update processed', {
        messageId,
        gpiStatus: gpiData.status
      });

      return { success: true };
    } catch (error) {
      logger.error('Error processing GPI update', {
        messageId,
        gpiData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get status statistics
   */
  async getStatusStatistics(userId = null) {
    try {
      let queryStr = `
        SELECT status, COUNT(*) as count
        FROM messages
      `;
      
      let queryParams = [];
      
      if (userId) {
        queryStr += ' WHERE created_by = $1';
        queryParams.push(userId);
      }
      
      queryStr += ' GROUP BY status ORDER BY status';

      const result = await query(queryStr, queryParams);

      const stats = {};
      result.rows.forEach(row => {
        stats[row.status] = parseInt(row.count);
      });

      return stats;
    } catch (error) {
      logger.error('Error getting status statistics', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all available statuses
   */
  getAllStatuses() {
    return this.statusTrail;
  }
}

export default new MessageStatusService();
