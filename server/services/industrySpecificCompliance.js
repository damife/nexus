/**
 * Industry-Specific Compliance Service for SwiftNexus Enterprise
 * Professional compliance checking for all SWIFT message types
 */

import { query } from '../config/database.js';
import logger from '../config/logger.js';

class IndustrySpecificCompliance {
  constructor() {
    this.complianceRules = new Map();
    this.industryRegulations = new Map();
    this.loadComplianceRules();
  }

  /**
   * Load compliance rules for different industries and message types
   */
  async loadComplianceRules() {
    // Banking industry compliance rules
    this.industryRegulations.set('banking', {
      requiredFields: ['senderBIC', 'receiverBIC', 'transactionReference'],
      amlThreshold: 10000,
      sanctionsCheck: true,
      documentationRequired: ['identity_verification', 'source_of_funds'],
      reportingThresholds: {
        cash: 10000,
        international: 25000,
        suspicious: 0
      }
    });

    // Securities industry compliance rules
    this.industryRegulations.set('securities', {
      requiredFields: ['senderBIC', 'receiverBIC', 'securityIdentification', 'quantity'],
      amlThreshold: 5000,
      sanctionsCheck: true,
      documentationRequired: ['trade_confirmation', 'settlement_instructions'],
      reportingThresholds: {
        securities: 50000,
        derivatives: 100000,
        suspicious: 0
      }
    });

    // Trade finance compliance rules
    this.industryRegulations.set('trade', {
      requiredFields: ['senderBIC', 'receiverBIC', 'documentaryCreditNumber', 'applicant', 'beneficiary'],
      amlThreshold: 25000,
      sanctionsCheck: true,
      documentationRequired: ['commercial_invoice', 'bill_of_lading', 'insurance_policy'],
      reportingThresholds: {
        trade: 100000,
        letters_of_credit: 50000,
        suspicious: 0
      }
    });

    // Treasury compliance rules
    this.industryRegulations.set('treasury', {
      requiredFields: ['senderBIC', 'receiverBIC', 'transactionReference', 'currency', 'amount'],
      amlThreshold: 100000,
      sanctionsCheck: true,
      documentationRequired: ['trade_confirmation', 'rate_source'],
      reportingThresholds: {
        forex: 1000000,
        money_market: 500000,
        suspicious: 0
      }
    });
  }

  /**
   * Perform industry-specific compliance check
   */
  async checkCompliance(messageData, messageType, industryType) {
    try {
      const complianceResult = {
        passed: true,
        warnings: [],
        errors: [],
        requiredActions: [],
        complianceLevel: this.getComplianceLevel(messageType),
        industryType: industryType
      };

      // Get industry-specific rules
      const industryRules = this.industryRegulations.get(industryType);
      if (!industryRules) {
        complianceResult.warnings.push(`No specific compliance rules for industry: ${industryType}`);
        return complianceResult;
      }

      // Check required fields
      await this.checkRequiredFields(messageData, industryRules, complianceResult);

      // Perform AML check
      await this.performAMLCheck(messageData, industryRules, complianceResult);

      // Perform sanctions check
      await this.performSanctionsCheck(messageData, complianceResult);

      // Check reporting thresholds
      await this.checkReportingThresholds(messageData, industryRules, complianceResult);

      // Message type specific compliance
      await this.performMessageTypeCompliance(messageData, messageType, complianceResult);

      // Geographic compliance
      await this.performGeographicCompliance(messageData, complianceResult);

      // Amount-based compliance
      await this.performAmountCompliance(messageData, industryRules, complianceResult);

      return complianceResult;
    } catch (error) {
      logger.error('Error in compliance check:', error);
      return {
        passed: false,
        errors: ['Compliance check failed'],
        warnings: [],
        requiredActions: ['Manual review required'],
        complianceLevel: 'high',
        industryType: industryType
      };
    }
  }

  /**
   * Check required fields for industry
   */
  async checkRequiredFields(messageData, industryRules, complianceResult) {
    const missingFields = [];
    
    for (const field of industryRules.requiredFields) {
      if (!messageData[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      complianceResult.passed = false;
      complianceResult.errors.push(`Missing required fields: ${missingFields.join(', ')}`);
      complianceResult.requiredActions.push(`Provide missing fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Perform AML (Anti-Money Laundering) check
   */
  async performAMLCheck(messageData, industryRules, complianceResult) {
    const amount = parseFloat(messageData.amount) || 0;
    
    if (amount >= industryRules.amlThreshold) {
      complianceResult.warnings.push(`Transaction amount ${amount} exceeds AML threshold ${industryRules.amlThreshold}`);
      complianceResult.requiredActions.push('Enhanced AML review required');
      
      // Check for suspicious patterns
      const suspiciousPatterns = await this.checkSuspiciousPatterns(messageData);
      if (suspiciousPatterns.length > 0) {
        complianceResult.passed = false;
        complianceResult.errors.push('Suspicious transaction patterns detected');
        complianceResult.requiredActions.push('Immediate compliance review required');
      }
    }
  }

  /**
   * Perform sanctions check
   */
  async performSanctionsCheck(messageData, complianceResult) {
    try {
      // Check sender and receiver against sanctions lists
      const senderBIC = messageData.senderBIC;
      const receiverBIC = messageData.receiverBIC;
      
      const sanctionsCheck = await this.querySanctionsList(senderBIC, receiverBIC);
      
      if (sanctionsCheck.hit) {
        complianceResult.passed = false;
        complianceResult.errors.push('Sanctions list hit detected');
        complianceResult.requiredActions.push('Block transaction and report to compliance officer');
      }
    } catch (error) {
      complianceResult.warnings.push('Sanctions check failed - manual review required');
    }
  }

  /**
   * Check reporting thresholds
   */
  async checkReportingThresholds(messageData, industryRules, complianceResult) {
    const amount = parseFloat(messageData.amount) || 0;
    const thresholds = industryRules.reportingThresholds;
    
    for (const [type, threshold] of Object.entries(thresholds)) {
      if (amount >= threshold) {
        complianceResult.warnings.push(`Transaction exceeds ${type} reporting threshold of ${threshold}`);
        complianceResult.requiredActions.push(`File ${type} report`);
      }
    }
  }

  /**
   * Message type specific compliance
   */
  async performMessageTypeCompliance(messageData, messageType, complianceResult) {
    const messageTypeCompliance = {
      'MT103': this.checkMT103Compliance,
      'MT700': this.checkMT700Compliance,
      'MT540': this.checkMT540Compliance,
      'MT202': this.checkMT202Compliance,
      'MT940': this.checkMT940Compliance,
      'MT199': this.checkMT199Compliance,
      'MT799': this.checkMT799Compliance
    };

    const complianceChecker = messageTypeCompliance[messageType];
    if (complianceChecker) {
      await complianceChecker.call(this, messageData, complianceResult);
    }
  }

  /**
   * MT103 specific compliance
   */
  async checkMT103Compliance(messageData, complianceResult) {
    // Check for customer credit transfer compliance
    if (!messageData.orderingCustomer || !messageData.beneficiaryCustomer) {
      complianceResult.warnings.push('Customer information incomplete');
      complianceResult.requiredActions.push('Verify customer identities');
    }

    // Check for high-value transfers
    const amount = parseFloat(messageData.amount) || 0;
    if (amount > 50000) {
      complianceResult.warnings.push('High-value customer transfer detected');
      complianceResult.requiredActions.push('Enhanced due diligence required');
    }
  }

  /**
   * MT700 specific compliance
   */
  async checkMT700Compliance(messageData, complianceResult) {
    // Documentary credit compliance
    if (!messageData.applicant || !messageData.beneficiary) {
      complianceResult.passed = false;
      complianceResult.errors.push('Applicant and beneficiary information required for documentary credit');
    }

    // Check credit amount
    const amount = parseFloat(messageData.amount) || 0;
    if (amount > 100000) {
      complianceResult.warnings.push('High-value documentary credit');
      complianceResult.requiredActions.push('Trade finance compliance review');
    }
  }

  /**
   * MT540 specific compliance
   */
  async checkMT540Compliance(messageData, complianceResult) {
    // Securities transfer compliance
    if (!messageData.securityIdentification) {
      complianceResult.passed = false;
      complianceResult.errors.push('Security identification required');
    }

    // Check for large securities transfers
    const quantity = parseFloat(messageData.quantity) || 0;
    if (quantity > 1000000) {
      complianceResult.warnings.push('Large securities transfer');
      complianceResult.requiredActions.push('Securities compliance review');
    }
  }

  /**
   * MT202 specific compliance
   */
  async checkMT202Compliance(messageData, complianceResult) {
    // Institution transfer compliance
    const amount = parseFloat(messageData.amount) || 0;
    if (amount > 1000000) {
      complianceResult.warnings.push('High-value institution transfer');
      complianceResult.requiredActions.push('Institutional compliance review');
    }
  }

  /**
   * MT940 specific compliance
   */
  async checkMT940Compliance(messageData, complianceResult) {
    // Account statement compliance - generally low risk
    complianceResult.complianceLevel = 'low';
  }

  /**
   * MT199 specific compliance
   */
  async checkMT199Compliance(messageData, complianceResult) {
    // Free format message compliance
    if (messageData.messageContent) {
      // Check for sensitive information
      const sensitiveKeywords = ['confidential', 'secret', 'internal', 'proprietary'];
      const content = messageData.messageContent.toLowerCase();
      
      for (const keyword of sensitiveKeywords) {
        if (content.includes(keyword)) {
          complianceResult.warnings.push(`Sensitive keyword detected: ${keyword}`);
          complianceResult.requiredActions.push('Review message content');
        }
      }
    }
  }

  /**
   * MT799 specific compliance
   */
  async checkMT799Compliance(messageData, complianceResult) {
    // Free format message for banks
    complianceResult.complianceLevel = 'medium';
    
    if (messageData.messageContent) {
      // Check for compliance-related content
      const complianceKeywords = ['sanctions', 'aml', 'compliance', 'regulatory'];
      const content = messageData.messageContent.toLowerCase();
      
      for (const keyword of complianceKeywords) {
        if (content.includes(keyword)) {
          complianceResult.warnings.push(`Compliance-related content: ${keyword}`);
          complianceResult.requiredActions.push('Compliance team review');
        }
      }
    }
  }

  /**
   * Perform geographic compliance
   */
  async performGeographicCompliance(messageData, complianceResult) {
    const highRiskCountries = await this.getHighRiskCountries();
    const receiverCountry = await this.getCountryFromBIC(messageData.receiverBIC);
    
    if (highRiskCountries.includes(receiverCountry)) {
      complianceResult.warnings.push(`Transaction to high-risk country: ${receiverCountry}`);
      complianceResult.requiredActions.push('Enhanced geographic compliance review');
    }
  }

  /**
   * Perform amount-based compliance
   */
  async performAmountCompliance(messageData, industryRules, complianceResult) {
    const amount = parseFloat(messageData.amount) || 0;
    
    // Check for round amounts (potential structuring)
    if (amount % 10000 === 0 && amount > 0) {
      complianceResult.warnings.push('Round amount detected - potential structuring');
      complianceResult.requiredActions.push('Review for potential structuring');
    }

    // Check for just-under-threshold amounts
    const threshold = industryRules.amlThreshold;
    if (amount > threshold * 0.95 && amount < threshold) {
      complianceResult.warnings.push('Amount just under reporting threshold');
      complianceResult.requiredActions.push('Review for threshold manipulation');
    }
  }

  /**
   * Check for suspicious transaction patterns
   */
  async checkSuspiciousPatterns(messageData) {
    const patterns = [];
    
    // Check for rapid multiple transactions
    const recentTransactions = await this.getRecentTransactions(messageData.senderBIC);
    if (recentTransactions.length > 10) {
      patterns.push('High transaction frequency');
    }

    // Check for multiple beneficiaries
    const uniqueBeneficiaries = new Set(recentTransactions.map(t => t.receiverBIC));
    if (uniqueBeneficiaries.size > 5) {
      patterns.push('Multiple beneficiaries pattern');
    }

    return patterns;
  }

  /**
   * Query sanctions list
   */
  async querySanctionsList(senderBIC, receiverBIC) {
    try {
      const result = await query(`
        SELECT * FROM sanctions_list 
        WHERE bic_code IN ($1, $2) AND is_active = true
      `, [senderBIC, receiverBIC]);

      return {
        hit: result.rows.length > 0,
        matches: result.rows
      };
    } catch (error) {
      logger.error('Error querying sanctions list:', error);
      return { hit: false, matches: [] };
    }
  }

  /**
   * Get high-risk countries
   */
  async getHighRiskCountries() {
    try {
      const result = await query(`
        SELECT country_code FROM high_risk_countries 
        WHERE is_active = true
      `);
      
      return result.rows.map(row => row.country_code);
    } catch (error) {
      logger.error('Error getting high-risk countries:', error);
      return [];
    }
  }

  /**
   * Get country from BIC code
   */
  async getCountryFromBIC(bic) {
    try {
      const result = await query(`
        SELECT country_code FROM bic_registry 
        WHERE bic_code = $1
      `, [bic]);

      return result.rows[0]?.country_code || 'Unknown';
    } catch (error) {
      logger.error('Error getting country from BIC:', error);
      return 'Unknown';
    }
  }

  /**
   * Get recent transactions for pattern analysis
   */
  async getRecentTransactions(bic, hours = 24) {
    try {
      const result = await query(`
        SELECT receiver_bic, amount, created_at 
        FROM messages 
        WHERE sender_bic = $1 
          AND created_at > NOW() - INTERVAL '${hours} hours'
        ORDER BY created_at DESC
      `, [bic]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      return [];
    }
  }

  /**
   * Get compliance level for message type
   */
  getComplianceLevel(messageType) {
    const complianceLevels = {
      'MT700': 'high', 'MT705': 'high', 'MT707': 'high', 'MT710': 'high',
      'MT760': 'high', 'MT767': 'high', 'MT768': 'high', 'MT769': 'high',
      'MT103': 'medium', 'MT202': 'medium', 'MT300': 'medium', 'MT320': 'medium',
      'MT540': 'medium', 'MT541': 'medium', 'MT542': 'medium', 'MT543': 'medium',
      'MT199': 'low', 'MT799': 'low', 'MT950': 'low', 'MT940': 'low'
    };

    return complianceLevels[messageType] || 'medium';
  }
}

export default new IndustrySpecificCompliance();
