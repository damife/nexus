import tenantConfig from '../config/tenant.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Middleware to load tenant context based on user
 */
const loadTenantContext = async (req, res, next) => {
  try {
    // Skip tenant loading for login and public routes
    const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/installer'];
    if (publicRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    const userId = req.user?.id;
    
    if (!userId) {
      return next();
    }

    // Get user's tenant assignment
    const tenantResult = await query(`
      SELECT 
        t.id,
        t.name,
        t.domain,
        t.bic_code,
        t.settings,
        tu.role as tenant_role,
        tu.permissions
      FROM tenants t
      INNER JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE tu.user_id = $1 AND t.is_active = true
      LIMIT 1
    `, [userId]);

    if (tenantResult.rows.length === 0) {
      // User has no tenant assignment, try to load default tenant
      await tenantConfig.loadDefaultTenant();
    } else {
      // Load user's tenant
      const tenant = tenantResult.rows[0];
      await tenantConfig.loadTenant(tenant.domain || tenant.bIC_code);
      
      // Add tenant info to request
      req.tenant = {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        bicCode: tenant.bic_code,
        settings: tenant.settings,
        role: tenant.tenant_role,
        permissions: tenant.permissions
      };
    }

    // Add tenant ID to user object for database queries
    if (req.user) {
      req.user.tenantId = tenantConfig.getCurrentTenant()?.id;
    }

    next();
  } catch (error) {
    logger.error('Error loading tenant context:', error);
    // Continue without tenant context for non-critical errors
    next();
  }
};

/**
 * Middleware to ensure user has tenant access
 */
const requireTenant = (req, res, next) => {
  if (!req.tenant) {
    return res.status(403).json({
      success: false,
      message: 'Tenant access required'
    });
  }
  next();
};

/**
 * Middleware to check tenant role permissions
 */
const requireTenantRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(403).json({
        success: false,
        message: 'Tenant access required'
      });
    }

    const userRole = req.tenant.role;
    
    // Role hierarchy: admin > user
    const roleHierarchy = {
      'admin': 2,
      'user': 1
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `Tenant role '${requiredRole}' required`
      });
    }

    next();
  };
};

/**
 * Middleware to check specific tenant permissions
 */
const requireTenantPermission = (permission) => {
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(403).json({
        success: false,
        message: 'Tenant access required'
      });
    }

    const permissions = req.tenant.permissions || [];
    
    if (!permissions.includes(permission) && req.tenant.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: `Tenant permission '${permission}' required`
      });
    }

    next();
  };
};

/**
 * Middleware to filter data by tenant
 */
const filterByTenant = (req, res, next) => {
  // Add tenant filter to query parameters
  if (req.tenant) {
    req.tenantFilter = {
      tenantId: req.tenant.id
    };
  }
  next();
};

/**
 * Middleware to validate tenant ownership
 */
const validateTenantOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.messageId || req.params.userId;
      const tenantId = req.tenant?.id;

      if (!tenantId) {
        return res.status(403).json({
          success: false,
          message: 'Tenant access required'
        });
      }

      let query = '';
      let params = [resourceId, tenantId];

      switch (resourceType) {
        case 'message':
          query = `
            SELECT m.id FROM messages m
            WHERE m.id = $1 AND m.tenant_id = $2
          `;
          break;
        case 'user':
          query = `
            SELECT u.id FROM users u
            INNER JOIN tenant_users tu ON u.id = tu.user_id
            WHERE u.id = $1 AND tu.tenant_id = $2
          `;
          break;
        case 'correspondent_bank':
          query = `
            SELECT id FROM correspondent_banks
            WHERE id = $1 AND tenant_id = $2
          `;
          break;
        default:
          return next(); // Skip validation for unknown resource types
      }

      const result = await query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `${resourceType} not found or access denied`
        });
      }

      next();
    } catch (error) {
      logger.error('Error validating tenant ownership:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating access'
      });
    }
  };
};

/**
 * Middleware to add tenant context to database queries
 */
const addTenantContext = (req, res, next) => {
  // Modify request to include tenant context in queries
  if (req.tenant) {
    req.addTenantFilter = (baseQuery) => {
      return baseQuery.replace(/FROM\s+(\w+)/g, (match, table) => {
        // Add tenant filter to common tables
        const tenantTables = ['messages', 'correspondent_banks', 'routing_rules'];
        if (tenantTables.includes(table)) {
          return `FROM ${table} WHERE tenant_id = ${req.tenant.id}`;
        }
        return match;
      });
    };
  }
  next();
};

/**
 * Middleware to log tenant activity
 */
const logTenantActivity = (action, resourceType) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log activity if request was successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.info('Tenant activity', {
          tenantId: req.tenant?.id,
          userId: req.user?.id,
          action,
          resourceType,
          resourceId: req.params.id || req.params.messageId,
          path: req.path,
          method: req.method,
          statusCode: res.statusCode
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

export {
  loadTenantContext,
  requireTenant,
  requireTenantRole,
  requireTenantPermission,
  filterByTenant,
  validateTenantOwnership,
  addTenantContext,
  logTenantActivity
};
