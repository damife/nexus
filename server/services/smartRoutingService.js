import { query } from '../config/database.js';
import tenantConfig from '../config/tenant.js';
import logger from '../config/logger.js';

class SmartRoutingService {
  constructor() {
    this.routingCache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Route message using smart routing logic
   */
  async routeMessage(messageData) {
    try {
      const tenant = tenantConfig.getCurrentTenant();
      if (!tenant) {
        throw new Error('No tenant loaded');
      }

      // Analyze message factors
      const factors = await this.analyzeMessage(messageData);
      
      // Get available routes
      const availableRoutes = await this.getAvailableRoutes(factors);
      
      // Select optimal route
      const optimalRoute = this.selectOptimalRoute(availableRoutes, factors);
      
      // Execute routing
      const routingResult = await this.executeRouting(messageData, optimalRoute, factors);
      
      // Log routing decision
      await this.logRoutingDecision(messageData, optimalRoute, factors, routingResult);
      
      logger.info('Message routed successfully', {
        messageId: messageData.id,
        route: optimalRoute.method,
        cost: optimalRoute.estimatedCost,
        speed: optimalRoute.estimatedSpeed
      });
      
      return routingResult;
    } catch (error) {
      logger.error('Error routing message:', error);
      throw error;
    }
  }

  /**
   * Analyze message factors for routing
   */
  async analyzeMessage(messageData) {
    const factors = {
      messageType: messageData.message_type,
      messageCategory: this.getMessageCategory(messageData.message_type),
      industryType: this.getIndustryType(messageData.message_type),
      complianceLevel: this.getComplianceLevel(messageData.message_type),
      urgencyLevel: this.getUrgencyLevel(messageData.message_type),
      isMXMessage: this.isMXMessage(messageData.message_type),
      amount: parseFloat(messageData.amount) || 0,
      currency: messageData.currency || 'USD',
      priority: messageData.priority || 'normal',
      destinationBIC: messageData.receiver_bic,
      destinationCountry: await this.getCountryFromBIC(messageData.receiver_bic),
      urgency: this.calculateUrgency(messageData),
      compliance: await this.checkCompliance(messageData),
      tenantId: tenantConfig.getCurrentTenant().id
    };

    // Get correspondent bank if specified
    if (messageData.correspondent_bank) {
      factors.correspondentBank = await this.getCorrespondentBank(messageData.correspondent_bank);
    }

    return factors;
  }

  /**
   * Get message category (0-9) from message type
   */
  getMessageCategory(messageType) {
    if (messageType.startsWith('MT')) {
      return messageType.substring(2, 3); // Returns 0-9
    }
    return 'MX'; // For MX messages
  }

  /**
   * Get industry type from message type
   */
  getIndustryType(messageType) {
    const industryMap = {
      '0': 'system',      // System Messages
      '1': 'payments',   // Customer Payments & Cheques
      '2': 'banking',    // Financial Institution Transfers
      '3': 'treasury',   // Treasury Markets
      '4': 'collections', // Collections & Cash Letters
      '5': 'securities', // Securities Markets
      '6': 'metals',     // Precious Metals
      '7': 'trade',      // Documentary Credits & Guarantees
      '8': 'travel',     // Travellers Cheques
      '9': 'cash'        // Cash Management
    };

    const category = this.getMessageCategory(messageType);
    return industryMap[category] || 'general';
  }

  /**
   * Get compliance level from message type
   */
  getComplianceLevel(messageType) {
    const complianceMap = {
      // High compliance messages
      'MT700': 'high', 'MT705': 'high', 'MT707': 'high', 'MT710': 'high',
      'MT760': 'high', 'MT767': 'high', 'MT768': 'high', 'MT769': 'high',
      
      // Medium compliance messages
      'MT103': 'medium', 'MT202': 'medium', 'MT300': 'medium', 'MT320': 'medium',
      'MT540': 'medium', 'MT541': 'medium', 'MT542': 'medium', 'MT543': 'medium',
      
      // Low compliance messages
      'MT199': 'low', 'MT799': 'low', 'MT950': 'low', 'MT940': 'low',
      
      // MX messages generally have higher compliance
      'pacs': 'high', 'pain': 'medium', 'camt': 'medium'
    };

    // Check for specific message types
    if (complianceMap[messageType]) {
      return complianceMap[messageType];
    }

    // Check for MX message categories
    if (messageType.includes('.')) {
      const category = messageType.split('.')[0];
      return complianceMap[category] || 'medium';
    }

    // Default based on industry type
    const industry = this.getIndustryType(messageType);
    return industry === 'securities' || industry === 'trade' ? 'high' : 'medium';
  }

  /**
   * Get urgency level from message type
   */
  getUrgencyLevel(messageType) {
    const urgencyMap = {
      // Real-time messages
      'MT103': 'realtime', 'MT202': 'realtime', 'MT199': 'realtime',
      
      // Normal priority messages
      'MT300': 'normal', 'MT320': 'normal', 'MT540': 'normal', 'MT541': 'normal',
      
      // Batch processing messages
      'MT940': 'batch', 'MT950': 'batch', 'MT942': 'batch',
      
      // MX messages
      'pacs': 'realtime', 'pain': 'normal', 'camt': 'batch'
    };

    if (urgencyMap[messageType]) {
      return urgencyMap[messageType];
    }

    if (messageType.includes('.')) {
      const category = messageType.split('.')[0];
      return urgencyMap[category] || 'normal';
    }

    return 'normal';
  }

  /**
   * Check if message is MX type
   */
  isMXMessage(messageType) {
    return messageType.includes('.');
  }

  /**
   * Get available routing options
   */
  async getAvailableRoutes(factors) {
    const cacheKey = `routes_${factors.messageType}_${factors.destinationCountry}_${factors.amount}`;
    const cached = this.routingCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.routes;
    }

    const routes = [];

    // Get category-specific routing rules first
    if (factors.messageCategory && factors.messageCategory !== 'MX') {
      const categoryRoutes = await this.getCategoryRoutingRules(factors.messageCategory, factors);
      routes.push(...categoryRoutes);
    }

    // Get MX-specific routing rules
    if (factors.isMXMessage) {
      const mxRoutes = await this.getMXRoutingRules(factors);
      routes.push(...mxRoutes);
    }

    // Get type-specific routing rules
    const typeSpecificRoutes = await this.getTypeSpecificRoutingRules(factors.messageType, factors);
    routes.push(...typeSpecificRoutes);

    // Get traditional routing rules as fallback
    const routingRules = await this.getRoutingRules(factors);
    for (const rule of routingRules) {
      if (this.isRuleApplicable(rule, factors)) {
        const route = await this.buildRouteFromRule(rule, factors);
        routes.push(route);
      }
    }

    // Add default routes if no specific rules found
    if (routes.length === 0) {
      routes.push(...await this.getDefaultRoutes(factors));
    }

    // Sort by priority (cost vs speed)
    routes.sort((a, b) => this.compareRoutes(a, b, factors));

    // Cache the routes
    this.routingCache.set(cacheKey, {
      routes,
      timestamp: Date.now()
    });

    return routes;
  }

  /**
   * Get category-specific routing rules
   */
  async getCategoryRoutingRules(category, factors) {
    const categoryRoutes = {
      '0': this.getSystemMessageRoutes,      // System Messages
      '1': this.getCustomerPaymentRoutes,    // Customer Payments & Cheques
      '2': this.getInstitutionTransferRoutes, // Financial Institution Transfers
      '3': this.getTreasuryRoutes,           // Treasury Markets
      '4': this.getCollectionRoutes,         // Collections & Cash Letters
      '5': this.getSecuritiesRoutes,         // Securities Markets
      '6': this.getPreciousMetalsRoutes,     // Treasury Markets - Precious Metals
      '7': this.getDocumentaryCreditRoutes,  // Documentary Credits & Guarantees
      '8': this.getTravellersChequeRoutes,   // Travellers Cheques
      '9': this.getCashManagementRoutes      // Cash Management & Customer Status
    };

    const categoryHandler = categoryRoutes[category];
    return categoryHandler ? await categoryHandler(factors) : [];
  }

  /**
   * Get MX message routing rules
   */
  async getMXRoutingRules(factors) {
    const mxCategories = {
      'pacs': this.getPaymentsClearingRoutes,
      'pain': this.getPaymentsInitiationRoutes,
      'camt': this.getCashManagementMXRoutes
    };

    const category = factors.messageType.split('.')[0];
    const mxHandler = mxCategories[category];
    return mxHandler ? await mxHandler(factors) : [];
  }

  /**
   * Get type-specific routing rules
   */
  async getTypeSpecificRoutingRules(messageType, factors) {
    const routingStrategies = {
      'MT103': this.routeCustomerTransfer,
      'MT199': this.routeFreeFormatMessage,
      'MT202': this.routeInstitutionTransfer,
      'MT300': this.routeForeignExchange,
      'MT320': this.routeLoanConfirmation,
      'MT540': this.routeSecuritiesTransfer,
      'MT541': this.routeSecuritiesReceive,
      'MT542': this.routeSecuritiesReceivePayment,
      'MT700': this.routeDocumentaryCredit,
      'MT710': this.routeDocumentaryCreditAdvice,
      'MT799': this.routeFreeFormatMessage,
      'MT940': this.routeAccountStatement,
      'MT950': this.routeStatementMessage,
      'MT910': this.routeConfirmationDebit
    };

    const strategy = routingStrategies[messageType];
    return strategy ? await strategy(factors) : [];
  }

  // Category-specific routing methods
  async getSystemMessageRoutes(factors) {
    return [{
      id: 'system_direct',
      method: 'system_direct',
      priority: 'high',
      estimatedCost: 0,
      estimatedSpeed: 'immediate',
      reliability: 0.999,
      compliance: 'high'
    }];
  }

  async getCustomerPaymentRoutes(factors) {
    const routes = [];
    
    // Direct SWIFT for high amounts
    if (factors.amount > 10000) {
      routes.push({
        id: 'customer_direct_swift',
        method: 'direct_swift',
        priority: 'high',
        estimatedCost: factors.amount * 0.001,
        estimatedSpeed: 'same_day',
        reliability: 0.998,
        compliance: factors.complianceLevel
      });
    }

    // Correspondent routing for international
    if (factors.destinationCountry && factors.destinationCountry !== 'US') {
      routes.push({
        id: 'customer_correspondent',
        method: 'correspondent',
        priority: 'medium',
        estimatedCost: factors.amount * 0.0015,
        estimatedSpeed: '1_2_days',
        reliability: 0.995,
        compliance: factors.complianceLevel
      });
    }

    // GPI routing for enhanced tracking
    routes.push({
      id: 'customer_gpi',
      method: 'gpi',
      priority: 'high',
      estimatedCost: factors.amount * 0.0012,
      estimatedSpeed: 'same_day',
      reliability: 0.999,
      compliance: factors.complianceLevel
    });

    return routes;
  }

  async getSecuritiesRoutes(factors) {
    return [{
      id: 'securities_direct',
      method: 'securities_direct',
      priority: 'high',
      estimatedCost: factors.amount * 0.0008,
      estimatedSpeed: 'realtime',
      reliability: 0.999,
      compliance: 'high'
    }];
  }

  async getDocumentaryCreditRoutes(factors) {
    return [{
      id: 'trade_direct',
      method: 'trade_direct',
      priority: 'high',
      estimatedCost: Math.max(factors.amount * 0.002, 50),
      estimatedSpeed: '1_2_days',
      reliability: 0.998,
      compliance: 'high'
    }];
  }

  async getCashManagementRoutes(factors) {
    return [{
      id: 'cash_batch',
      method: 'batch',
      priority: 'low',
      estimatedCost: 5,
      estimatedSpeed: 'batch',
      reliability: 0.995,
      compliance: 'medium'
    }];
  }

  // MX-specific routing methods
  async getPaymentsClearingRoutes(factors) {
    return [{
      id: 'pacs_direct',
      method: 'iso20022_direct',
      priority: 'high',
      estimatedCost: factors.amount * 0.0008,
      estimatedSpeed: 'realtime',
      reliability: 0.999,
      compliance: 'high'
    }];
  }

  async getPaymentsInitiationRoutes(factors) {
    return [{
      id: 'pain_direct',
      method: 'iso20022_initiation',
      priority: 'medium',
      estimatedCost: factors.amount * 0.001,
      estimatedSpeed: 'normal',
      reliability: 0.998,
      compliance: 'medium'
    }];
  }

  async getCashManagementMXRoutes(factors) {
    return [{
      id: 'camt_direct',
      method: 'iso20022_cash',
      priority: 'low',
      estimatedCost: 2,
      estimatedSpeed: 'batch',
      reliability: 0.995,
      compliance: 'medium'
    }];
  }

  // Type-specific routing methods
  async routeCustomerTransfer(factors) {
    return [{
      id: 'mt103_optimized',
      method: 'mt103_optimized',
      priority: 'high',
      estimatedCost: factors.amount * 0.001,
      estimatedSpeed: 'same_day',
      reliability: 0.999,
      compliance: factors.complianceLevel,
      features: ['real_time_tracking', 'end_to_end_visibility']
    }];
  }

  async routeDocumentaryCredit(factors) {
    return [{
      id: 'mt700_trade',
      method: 'documentary_credit',
      priority: 'high',
      estimatedCost: Math.max(factors.amount * 0.002, 100),
      estimatedSpeed: '1_2_days',
      reliability: 0.998,
      compliance: 'high',
      features: ['trade_compliance', 'document_verification']
    }];
  }

  async routeSecuritiesTransfer(factors) {
    return [{
      id: 'mt540_securities',
      method: 'securities_transfer',
      priority: 'high',
      estimatedCost: factors.amount * 0.0005,
      estimatedSpeed: 'realtime',
      reliability: 0.999,
      compliance: 'high',
      features: ['settlement_guarantee', 'custody_verification']
    }];
  }

  /**
   * Get routing rules from database
   */
  async getRoutingRules(factors) {
    const result = await query(`
      SELECT * FROM routing_rules 
      WHERE tenant_id = $1 
        AND message_type = $2 
        AND is_active = true
        AND ($3::decimal IS NULL OR amount_min IS NULL OR $3::decimal >= amount_min)
        AND ($3::decimal IS NULL OR amount_max IS NULL OR $3::decimal <= amount_max)
        AND ($4 IS NULL OR destination_country IS NULL OR destination_country = $4)
      ORDER BY priority_level DESC, cost_factor ASC
    `, [
      factors.tenantId,
      factors.messageType,
      factors.amount || null,
      factors.destinationCountry || null
    ]);

    return result.rows;
  }

  /**
   * Check if routing rule is applicable
   */
  isRuleApplicable(rule, factors) {
    // Check amount range
    if (rule.amount_min && factors.amount < parseFloat(rule.amount_min)) {
      return false;
    }
    if (rule.amount_max && factors.amount > parseFloat(rule.amount_max)) {
      return false;
    }

    // Check country
    if (rule.destination_country && factors.destinationCountry !== rule.destination_country) {
      return false;
    }

    // Check custom conditions
    if (rule.conditions) {
      const conditions = JSON.parse(rule.conditions);
      for (const [key, value] of Object.entries(conditions)) {
        if (factors[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Build route from routing rule
   */
  async buildRouteFromRule(rule, factors) {
    const route = {
      id: rule.id,
      method: rule.routing_method,
      priority: rule.priority_level,
      estimatedCost: this.calculateEstimatedCost(rule, factors),
      estimatedSpeed: this.calculateEstimatedSpeed(rule, factors),
      reliability: this.calculateReliability(rule),
      compliance: rule.conditions?.compliance || 'standard'
    };

    // Add correspondent bank info if applicable
    if (factors.correspondentBank) {
      route.correspondentBank = factors.correspondentBank;
    }

    return route;
  }

  /**
   * Get default routing options
   */
  async getDefaultRoutes(factors) {
    const routes = [];

    // Direct SWIFT routing
    routes.push({
      id: 'direct_swift',
      method: 'direct_swift',
      priority: 'high',
      estimatedCost: this.getDirectSWIFTCost(factors),
      estimatedSpeed: this.getDirectSWIFTSpeed(factors),
      reliability: 0.99,
      compliance: 'high'
    });

    // Correspondent banking routing
    routes.push({
      id: 'correspondent',
      method: 'correspondent_banking',
      priority: 'medium',
      estimatedCost: this.getCorrespondentCost(factors),
      estimatedSpeed: this.getCorrespondentSpeed(factors),
      reliability: 0.95,
      compliance: 'standard'
    });

    // GPI routing for high-value or urgent messages
    if (factors.amount > 10000 || factors.priority === 'urgent') {
      routes.push({
        id: 'gpi',
        method: 'swift_gpi',
        priority: 'high',
        estimatedCost: this.getGPICost(factors),
        estimatedSpeed: this.getGPISpeed(factors),
        reliability: 0.98,
        compliance: 'high'
      });
    }

    return routes;
  }

  /**
   * Select optimal route based on factors
   */
  selectOptimalRoute(routes, factors) {
    if (routes.length === 0) {
      throw new Error('No available routes found');
    }

    // Priority scoring based on message characteristics
    let bestRoute = routes[0];
    let bestScore = this.calculateRouteScore(bestRoute, factors);

    for (const route of routes.slice(1)) {
      const score = this.calculateRouteScore(route, factors);
      if (score > bestScore) {
        bestScore = score;
        bestRoute = route;
      }
    }

    return bestRoute;
  }

  /**
   * Calculate route score for selection
   */
  calculateRouteScore(route, factors) {
    let score = 0;

    // Priority weighting (40%)
    const priorityWeight = {
      'urgent': 100,
      'high': 80,
      'normal': 60,
      'low': 40
    };
    score += (priorityWeight[factors.priority] || 60) * 0.4;

    // Cost weighting (30%)
    const maxCost = 100; // Assume max cost is $100
    const costScore = Math.max(0, (maxCost - route.estimatedCost) / maxCost * 100);
    score += costScore * 0.3;

    // Speed weighting (20%)
    const speedScore = (100 - route.estimatedSpeed) / 100 * 100; // Lower is better
    score += speedScore * 0.2;

    // Reliability weighting (10%)
    score += route.reliability * 10;

    return score;
  }

  /**
   * Execute the selected routing
   */
  async executeRouting(messageData, route, factors) {
    const routingResult = {
      messageId: messageData.id,
      routeId: route.id,
      method: route.method,
      estimatedCost: route.estimatedCost,
      estimatedSpeed: route.estimatedSpeed,
      status: 'initiated',
      trackingId: this.generateTrackingId(),
      executedAt: new Date().toISOString()
    };

    // Update message with routing information
    await query(`
      UPDATE messages 
      SET routing_method = $1, 
          routing_cost = $2, 
          estimated_delivery = $3,
          tracking_id = $4,
          status = 'routing'
      WHERE id = $5
    `, [
      route.method,
      route.estimatedCost,
      this.calculateDeliveryTime(route.estimatedSpeed),
      routingResult.trackingId,
      messageData.id
    ]);

    // Add to status trail
    await this.addToStatusTrail(messageData.id, 'routing', 'Message routed', {
      method: route.method,
      cost: route.estimatedCost,
      trackingId: routingResult.trackingId
    });

    // Execute specific routing method
    switch (route.method) {
      case 'direct_swift':
        await this.executeDirectSWIFT(messageData, routingResult);
        break;
      case 'correspondent_banking':
        await this.executeCorrespondentBanking(messageData, routingResult, route.correspondentBank);
        break;
      case 'swift_gpi':
        await this.executeGPIRouting(messageData, routingResult);
        break;
      default:
        throw new Error(`Unknown routing method: ${route.method}`);
    }

    routingResult.status = 'executed';
    return routingResult;
  }

  /**
   * Execute direct SWIFT routing
   */
  async executeDirectSWIFT(messageData, routingResult) {
    // Simulate direct SWIFT connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await query(`
      UPDATE messages 
      SET status = 'sent', 
          sent_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [messageData.id]);

    await this.addToStatusTrail(messageData.id, 'sent', 'Message sent via direct SWIFT', {
      trackingId: routingResult.trackingId
    });
  }

  /**
   * Execute correspondent banking routing
   */
  async executeCorrespondentBanking(messageData, routingResult, correspondentBank) {
    // Simulate correspondent banking
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await query(`
      UPDATE messages 
      SET status = 'sent', 
          sent_at = CURRENT_TIMESTAMP,
          correspondent_bank = $1
      WHERE id = $2
    `, [correspondentBank?.bic_code || null, messageData.id]);

    await this.addToStatusTrail(messageData.id, 'sent', 'Message sent via correspondent banking', {
      trackingId: routingResult.trackingId,
      correspondentBank: correspondentBank?.name
    });
  }

  /**
   * Execute GPI routing
   */
  async executeGPIRouting(messageData, routingResult) {
    // Simulate GPI routing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await query(`
      UPDATE messages 
      SET status = 'sent', 
          sent_at = CURRENT_TIMESTAMP,
          gpi_enabled = true
      WHERE id = $1
    `, [messageData.id]);

    await this.addToStatusTrail(messageData.id, 'sent', 'Message sent via SWIFT gpi', {
      trackingId: routingResult.trackingId,
      gpiEnabled: true
    });
  }

  /**
   * Add entry to status trail
   */
  async addToStatusTrail(messageId, status, description, metadata = {}) {
    await query(`
      INSERT INTO message_status_trail 
      (message_id, status, status_label, description, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [messageId, status, status.toUpperCase(), description, JSON.stringify(metadata)]);
  }

  /**
   * Get correspondent bank by BIC
   */
  async getCorrespondentBank(bicCode) {
    try {
      const tenant = tenantConfig.getCurrentTenant();
      const result = await query(`
        SELECT * FROM correspondent_banks 
        WHERE tenant_id = $1 AND bic_code = $2 AND is_active = true
      `, [tenant.id, bicCode]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting correspondent bank:', error);
      return null;
    }
  }

  /**
   * Get all correspondent banks for tenant
   */
  async getCorrespondentBanks() {
    try {
      const tenant = tenantConfig.getCurrentTenant();
      const result = await query(`
        SELECT * FROM correspondent_banks 
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY name ASC
      `, [tenant.id]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting correspondent banks:', error);
      return [];
    }
  }

  /**
   * Add correspondent bank
   */
  async addCorrespondentBank(bankData) {
    try {
      const tenant = tenantConfig.getCurrentTenant();
      const result = await query(`
        INSERT INTO correspondent_banks 
        (tenant_id, name, bic_code, bank_code, address, country, currency, routing_preferences)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        tenant.id,
        bankData.name,
        bankData.bicCode,
        bankData.bankCode,
        bankData.address,
        bankData.country,
        bankData.currency || 'USD',
        JSON.stringify(bankData.routingPreferences || {})
      ]);

      logger.info('Correspondent bank added', { 
        tenantId: tenant.id, 
        bicCode: bankData.bicCode 
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error adding correspondent bank:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  calculateUrgency(messageData) {
    const priority = messageData.priority || 'normal';
    const amount = parseFloat(messageData.amount) || 0;
    
    if (priority === 'urgent' || amount > 100000) return 'high';
    if (priority === 'high' || amount > 10000) return 'medium';
    return 'low';
  }

  async checkCompliance(messageData) {
    // Basic compliance check
    return {
      approved: true,
      level: 'standard',
      checks: ['sanctions', 'aml', 'kyc']
    };
  }

  async getCountryFromBIC(bicCode) {
    // Extract country from BIC code (simplified)
    if (!bicCode || bicCode.length < 6) return null;
    const countryCode = bicCode.substring(4, 6);
    return countryCode; // This would need a proper country mapping
  }

  generateTrackingId() {
    return 'TRK' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  calculateDeliveryTime(speedHours) {
    const deliveryTime = new Date();
    deliveryTime.setHours(deliveryTime.getHours() + speedHours);
    return deliveryTime.toISOString();
  }

  // Cost calculation methods (simplified)
  getDirectSWIFTCost(factors) {
    return factors.amount > 10000 ? 25.00 : 15.00;
  }

  getCorrespondentCost(factors) {
    return factors.amount > 10000 ? 20.00 : 10.00;
  }

  getGPICost(factors) {
    return factors.amount > 10000 ? 35.00 : 25.00;
  }

  // Speed calculation methods (in hours)
  getDirectSWIFTSpeed(factors) {
    return factors.priority === 'urgent' ? 1 : 24;
  }

  getCorrespondentSpeed(factors) {
    return factors.priority === 'urgent' ? 2 : 48;
  }

  getGPISpeed(factors) {
    return factors.priority === 'urgent' ? 0.5 : 12;
  }

  calculateEstimatedCost(rule, factors) {
    const baseCost = 10.00; // Base SWIFT cost
    return baseCost * parseFloat(rule.cost_factor);
  }

  calculateEstimatedSpeed(rule, factors) {
    const baseSpeed = 24; // Base speed in hours
    return baseSpeed * parseFloat(rule.speed_factor);
  }

  calculateReliability(rule) {
    // Base reliability on routing method
    const reliabilityMap = {
      'direct_swift': 0.99,
      'swift_gpi': 0.98,
      'correspondent_banking': 0.95
    };
    return reliabilityMap[rule.routing_method] || 0.90;
  }

  compareRoutes(a, b, factors) {
    // Compare routes based on priority and cost
    const priorityOrder = { 'urgent': 3, 'high': 2, 'normal': 1, 'low': 0 };
    const aPriority = priorityOrder[factors.priority] || 1;
    const bPriority = priorityOrder[factors.priority] || 1;

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }

    return a.estimatedCost - b.estimatedCost; // Lower cost first
  }

  async logRoutingDecision(messageData, route, factors, result) {
    await query(`
      INSERT INTO routing_logs 
      (message_id, tenant_id, route_method, estimated_cost, estimated_speed, factors, result, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `, [
      messageData.id,
      factors.tenantId,
      route.method,
      route.estimatedCost,
      route.estimatedSpeed,
      JSON.stringify(factors),
      JSON.stringify(result)
    ]);
  }
}

export default new SmartRoutingService();
