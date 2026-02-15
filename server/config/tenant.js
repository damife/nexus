import { query } from './database.js';
import logger from './logger.js';

class TenantConfig {
  constructor() {
    this.currentTenant = null;
    this.tenantCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize tenant configuration
   */
  async initialize() {
    try {
      // Ensure tenant tables exist
      await this.ensureTenantTables();
      
      // Load default tenant if no tenant specified
      if (!this.currentTenant) {
        await this.loadDefaultTenant();
      }
      
      logger.info('Tenant configuration initialized');
    } catch (error) {
      logger.error('Error initializing tenant configuration:', error);
      throw error;
    }
  }

  /**
   * Ensure tenant-related tables exist
   */
  async ensureTenantTables() {
    await query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE,
        bic_code VARCHAR(11) UNIQUE,
        database_name VARCHAR(255) UNIQUE,
        settings JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS tenant_users (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'user',
        permissions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, user_id)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS correspondent_banks (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        bic_code VARCHAR(11) NOT NULL,
        bank_code VARCHAR(50),
        address TEXT,
        country VARCHAR(100),
        currency VARCHAR(3) DEFAULT 'USD',
        routing_preferences JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, bic_code)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS routing_rules (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        message_type VARCHAR(20) NOT NULL,
        destination_country VARCHAR(100),
        amount_min DECIMAL(15,2),
        amount_max DECIMAL(15,2),
        priority_level VARCHAR(20) DEFAULT 'normal',
        routing_method VARCHAR(50) NOT NULL,
        cost_factor DECIMAL(5,4) DEFAULT 1.0000,
        speed_factor DECIMAL(5,4) DEFAULT 1.0000,
        conditions JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
      CREATE INDEX IF NOT EXISTS idx_tenants_bic_code ON tenants(bic_code);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
      CREATE INDEX IF NOT EXISTS idx_correspondent_banks_tenant_id ON correspondent_banks(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_correspondent_banks_bic_code ON correspondent_banks(bic_code);
      CREATE INDEX IF NOT EXISTS idx_routing_rules_tenant_id ON routing_rules(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_routing_rules_message_type ON routing_rules(message_type);
    `);
  }

  /**
   * Load tenant by domain or BIC
   */
  async loadTenant(identifier) {
    try {
      const cacheKey = `tenant_${identifier}`;
      const cached = this.tenantCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        this.currentTenant = cached.data;
        return cached.data;
      }

      const result = await query(`
        SELECT * FROM tenants 
        WHERE (domain = $1 OR bic_code = $1) AND is_active = true
      `, [identifier]);

      if (result.rows.length === 0) {
        throw new Error(`Tenant not found: ${identifier}`);
      }

      const tenant = result.rows[0];
      
      // Cache the tenant data
      this.tenantCache.set(cacheKey, {
        data: tenant,
        timestamp: Date.now()
      });

      this.currentTenant = tenant;
      logger.info('Tenant loaded', { tenantId: tenant.id, name: tenant.name });
      
      return tenant;
    } catch (error) {
      logger.error('Error loading tenant:', error);
      throw error;
    }
  }

  /**
   * Load default tenant
   */
  async loadDefaultTenant() {
    try {
      const result = await query(`
        SELECT * FROM tenants 
        WHERE is_active = true 
        ORDER BY id ASC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        // Create default tenant if none exists
        await this.createDefaultTenant();
        return this.loadDefaultTenant();
      }

      this.currentTenant = result.rows[0];
      logger.info('Default tenant loaded', { tenantId: this.currentTenant.id });
      
      return this.currentTenant;
    } catch (error) {
      logger.error('Error loading default tenant:', error);
      throw error;
    }
  }

  /**
   * Create default tenant
   */
  async createDefaultTenant() {
    try {
      const result = await query(`
        INSERT INTO tenants (name, domain, bic_code, settings)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        'SwiftNexus Default',
        'default.swiftnexus.com',
        'SWFTUS33XXX',
        JSON.stringify({
          timezone: 'UTC',
          currency: 'USD',
          language: 'en',
          features: {
            smart_routing: true,
            correspondent_selection: true,
            status_tracking: true
          }
        })
      ]);

      logger.info('Default tenant created', { tenantId: result.rows[0].id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating default tenant:', error);
      throw error;
    }
  }

  /**
   * Get current tenant
   */
  getCurrentTenant() {
    return this.currentTenant;
  }

  /**
   * Set current tenant
   */
  setCurrentTenant(tenant) {
    this.currentTenant = tenant;
  }

  /**
   * Middleware to load tenant context
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const tenantId = req.user.tenantId || req.headers['x-tenant-id'];
        
        if (!tenantId) {
          return res.status(400).json({ 
            success: false, 
            error: 'Tenant ID required' 
          });
        }

        const tenant = await this.loadTenantById(tenantId);
        req.tenant = tenant;
        
        // Set tenant context for database queries
        await query('SET app.current_tenant_id = $1', [tenantId]);
        
        next();
      } catch (error) {
        return res.status(403).json({ 
          success: false, 
          error: error.message 
        });
      }
    };
  }

  /**
   * Clear cache
   */
  clearCache(tenantId = null) {
    if (tenantId) {
      this.tenantCache.delete(tenantId);
    } else {
      this.tenantCache.clear();
    }
  }

  /**
   * Validate tenant access
   */
  async validateTenantAccess(userId, tenantId) {
    try {
      const result = await query(`
        SELECT tu.*, t.name as tenant_name, t.is_active
        FROM tenant_users tu
        JOIN tenants t ON tu.tenant_id = t.id
        WHERE tu.user_id = $1 AND tu.tenant_id = $2 AND tu.is_active = true AND t.is_active = true
      `, [userId, tenantId]);

      if (result.rows.length === 0) {
        throw new Error('User does not have access to this tenant');
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Tenant access validation failed: ${error.message}`);
    }
  }

  /**
   * Get tenant setting
   */
  getTenantSetting(key, defaultValue = null) {
    if (!this.currentTenant || !this.currentTenant.settings) {
      return defaultValue;
    }
    
    return this.currentTenant.settings[key] || defaultValue;
  }

  /**
   * Update tenant setting
   */
  async updateTenantSetting(key, value) {
    try {
      if (!this.currentTenant) {
        throw new Error('No tenant loaded');
      }

      const settings = { ...this.currentTenant.settings };
      settings[key] = value;

      await query(`
        UPDATE tenants 
        SET settings = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [JSON.stringify(settings), this.currentTenant.id]);

      this.currentTenant.settings = settings;
      
      // Clear cache
      this.tenantCache.clear();
      
      logger.info('Tenant setting updated', { 
        tenantId: this.currentTenant.id, 
        key, 
        value 
      });
      
      return true;
    } catch (error) {
      logger.error('Error updating tenant setting:', error);
      throw error;
    }
  }

  /**
   * Get user's tenant role
   */
  async getUserTenantRole(userId) {
    try {
      if (!this.currentTenant) {
        return null;
      }

      const result = await query(`
        SELECT role, permissions 
        FROM tenant_users 
        WHERE tenant_id = $1 AND user_id = $2
      `, [this.currentTenant.id, userId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting user tenant role:', error);
      return null;
    }
  }

  /**
   * Add user to tenant
   */
  async addUserToTenant(userId, role = 'user', permissions = []) {
    try {
      if (!this.currentTenant) {
        throw new Error('No tenant loaded');
      }

      await query(`
        INSERT INTO tenant_users (tenant_id, user_id, role, permissions)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, user_id) 
        DO UPDATE SET role = $3, permissions = $4, updated_at = CURRENT_TIMESTAMP
      `, [this.currentTenant.id, userId, role, JSON.stringify(permissions)]);

      logger.info('User added to tenant', { 
        tenantId: this.currentTenant.id, 
        userId, 
        role 
      });
      
      return true;
    } catch (error) {
      logger.error('Error adding user to tenant:', error);
      throw error;
    }
  }

  /**
   * Clear tenant cache
   */
  clearCache() {
    this.tenantCache.clear();
  }
}

export default new TenantConfig();
