import { query } from '../config/database.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

class HardwareTokenService {
  constructor() {
    this.supportedTokens = {
      'yubikey': {
        name: 'YubiKey',
        description: 'Yubico YubiKey hardware token',
        icon: '🔑'
      },
      'google_titan': {
        name: 'Google Titan',
        description: 'Google Titan Security Key',
        icon: '🛡️'
      },
      'fido2': {
        name: 'FIDO2 Key',
        description: 'Generic FIDO2 security key',
        icon: '🔐'
      }
    };
  }

  // Register new hardware token
  async registerHardwareToken(userId, tokenData) {
    try {
      const { tokenType, credentialId, publicKey, name } = tokenData;

      if (!this.supportedTokens[tokenType]) {
        throw new Error(`Unsupported token type: ${tokenType}`);
      }

      // Generate unique token ID
      const tokenId = crypto.randomUUID();

      // Store hardware token
      const result = await query(`
        INSERT INTO hardware_tokens (
          user_id, token_type, credential_id, public_key, name, token_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [userId, tokenType, credentialId, publicKey, name, tokenId]);

      logger.info('Hardware token registered', {
        userId,
        tokenId,
        tokenType,
        name
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error registering hardware token', {
        error: error.message,
        userId,
        tokenType: tokenData.tokenType
      });
      throw error;
    }
  }

  // Verify hardware token challenge
  async verifyHardwareToken(userId, challengeResponse) {
    try {
      const { credentialId, signature, clientDataJSON, authenticatorData } = challengeResponse;

      // Find hardware token
      const result = await query(`
        SELECT * FROM hardware_tokens 
        WHERE user_id = $1 AND credential_id = $2
      `, [userId, credentialId]);

      if (result.rows.length === 0) {
        return { valid: false, reason: 'token_not_found' };
      }

      const token = result.rows[0];

      // Verify signature (simplified - in production, use proper WebAuthn verification)
      const isValid = await this.verifySignature(
        token.public_key,
        signature,
        clientDataJSON,
        authenticatorData
      );

      if (isValid) {
        logger.info('Hardware token verified', {
          userId,
          tokenId: token.id,
          tokenType: token.token_type
        });
      }

      return { valid: isValid, token };
    } catch (error) {
      logger.error('Error verifying hardware token', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Verify signature (simplified implementation)
  async verifySignature(publicKey, signature, clientDataJSON, authenticatorData) {
    try {
      // In production, implement proper WebAuthn signature verification
      // This is a simplified version for demonstration
      
      const publicKeyBuffer = Buffer.from(publicKey, 'base64');
      const signatureBuffer = Buffer.from(signature, 'base64');
      
      // Create verification data
      const verificationData = Buffer.concat([
        Buffer.from(authenticatorData, 'base64'),
        crypto.createHash('sha256').update(clientDataJSON).digest()
      ]);

      // Verify using crypto module (simplified)
      // In production, use proper WebAuthn libraries
      const isValid = crypto.verify(
        'sha256',
        verificationData,
        publicKeyBuffer,
        signatureBuffer
      );

      return isValid;
    } catch (error) {
      logger.error('Signature verification error', {
        error: error.message
      });
      return false;
    }
  }

  // Get user's hardware tokens
  async getUserHardwareTokens(userId) {
    try {
      const result = await query(`
        SELECT 
          id,
          token_type,
          name,
          credential_id,
          created_at,
          last_used_at
        FROM hardware_tokens 
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows.map(token => ({
        ...token,
        info: this.supportedTokens[token.token_type] || {
          name: 'Unknown Token',
          description: 'Unknown hardware token',
          icon: '🔑'
        }
      }));
    } catch (error) {
      logger.error('Error getting user hardware tokens', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Remove hardware token
  async removeHardwareToken(userId, tokenId) {
    try {
      const result = await query(`
        DELETE FROM hardware_tokens 
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [tokenId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Hardware token not found');
      }

      logger.info('Hardware token removed', {
        userId,
        tokenId,
        tokenType: result.rows[0].token_type
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error removing hardware token', {
        error: error.message,
        userId,
        tokenId
      });
      throw error;
    }
  }

  // Update last used timestamp
  async updateLastUsed(tokenId) {
    try {
      await query(`
        UPDATE hardware_tokens 
        SET last_used_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [tokenId]);
    } catch (error) {
      logger.error('Error updating last used timestamp', {
        error: error.message,
        tokenId
      });
      throw error;
    }
  }

  // Generate challenge for hardware token
  async generateChallenge(userId, tokenType) {
    try {
      // Generate random challenge
      const challenge = crypto.randomBytes(32).toString('base64');
      const challengeId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store challenge
      await query(`
        INSERT INTO hardware_challenges (
          user_id, challenge, challenge_id, token_type, expires_at
        )
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, challenge, challengeId, tokenType, expiresAt]);

      logger.info('Hardware token challenge generated', {
        userId,
        challengeId,
        tokenType
      });

      return {
        challenge,
        challengeId,
        expiresAt,
        tokenType
      };
    } catch (error) {
      logger.error('Error generating hardware token challenge', {
        error: error.message,
        userId,
        tokenType
      });
      throw error;
    }
  }

  // Verify and consume challenge
  async verifyChallenge(challengeId, response) {
    try {
      const result = await query(`
        SELECT * FROM hardware_challenges 
        WHERE challenge_id = $1 AND used = FALSE
      `, [challengeId]);

      if (result.rows.length === 0) {
        return { valid: false, reason: 'challenge_not_found' };
      }

      const challenge = result.rows[0];

      // Check if expired
      if (new Date(challenge.expires_at) < new Date()) {
        return { valid: false, reason: 'challenge_expired' };
      }

      // Mark challenge as used
      await query(`
        UPDATE hardware_challenges 
        SET used = TRUE, used_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [challenge.id]);

      return {
        valid: true,
        challenge: challenge
      };
    } catch (error) {
      logger.error('Error verifying hardware token challenge', {
        error: error.message,
        challengeId
      });
      throw error;
    }
  }

  // Get supported token types
  getSupportedTokenTypes() {
    return Object.entries(this.supportedTokens).map(([key, info]) => ({
      type: key,
      ...info
    }));
  }

  // Check if user has hardware tokens
  async hasHardwareTokens(userId) {
    try {
      const result = await query(`
        SELECT COUNT(*) as count FROM hardware_tokens 
        WHERE user_id = $1
      `, [userId]);

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking hardware tokens', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Get hardware token statistics
  async getHardwareTokenStatistics() {
    try {
      const result = await query(`
        SELECT 
          token_type,
          COUNT(*) as total_tokens,
          COUNT(CASE WHEN last_used_at > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_tokens
        FROM hardware_tokens 
        GROUP BY token_type
        ORDER BY total_tokens DESC
      `);

      return result.rows;
    } catch (error) {
      logger.error('Error getting hardware token statistics', {
        error: error.message
      });
      throw error;
    }
  }
}

export default new HardwareTokenService();
