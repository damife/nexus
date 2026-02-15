import AccessControl from 'accesscontrol';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Role-Based Access Control (RBAC) Configuration
 * Implements Maker/Checker pattern and role-based permissions
 */
const ac = new AccessControl();

// Define roles and permissions
ac.grant('user')
  .readOwn('message')
  .createOwn('message')
  .updateOwn('message')
  .readOwn('profile')
  .updateOwn('profile')
  .readOwn('bank')
  .readOwn('stats');

ac.grant('maker')
  .extend('user')
  .createOwn('message')
  .updateOwn('message')
  .readOwn('message')
  .readOwn('queue');

ac.grant('checker')
  .extend('user')
  .readOwn('message')
  .updateOwn('message')
  .update('message', ['status']) // Can authorize/reject messages
  .readOwn('queue')
  .readOwn('stats');

ac.grant('admin')
  .extend('checker')
  .extend('maker')
  .createAny('user')
  .readAny('user')
  .updateAny('user')
  .deleteAny('user')
  .createAny('bank')
  .readAny('bank')
  .updateAny('bank')
  .deleteAny('bank')
  .readAny('message')
  .updateAny('message')
  .deleteAny('message')
  .readAny('stats')
  .updateAny('settings');

/**
 * RBAC Middleware
 */
export const rbac = (action, resource) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Get user's role from database (in case it changed)
      const userResult = await query(
        'SELECT role FROM users WHERE id = $1',
        [user.id]
      );

      const userRole = userResult.rows[0]?.role || user.role || 'user';

      // Check permission
      const permission = ac.can(userRole)[action](resource);

      if (!permission.granted) {
        logger.warn('Access denied', {
          userId: user.id,
          role: userRole,
          action,
          resource
        });
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      // Add permission to request for fine-grained checks
      req.permission = permission;
      req.userRole = userRole;

      next();
    } catch (error) {
      logger.error('RBAC middleware error', { error: error.message });
      res.status(500).json({ success: false, message: 'Authorization error' });
    }
  };
};

/**
 * Maker/Checker validation
 * Ensures the user who creates a message cannot approve it
 */
export const makerChecker = async (req, res, next) => {
  try {
    const user = req.user;
    const { messageId, id } = req.params;
    const messageIdParam = messageId || id;

    if (!messageIdParam) {
      return next(); // No message ID, skip check
    }

    // Get message creator
    const messageResult = await query(
      'SELECT created_by, status FROM messages WHERE id = $1 OR message_id = $1',
      [messageIdParam]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const message = messageResult.rows[0];

    // Check if user is trying to authorize their own message
    if (message.created_by === user.id && 
        (req.body.status === 'authorized' || req.body.action === 'authorize')) {
      logger.warn('Maker/Checker violation', {
        userId: user.id,
        messageId: messageIdParam,
        action: 'authorize own message'
      });
      return res.status(403).json({
        success: false,
        message: 'Maker/Checker rule: You cannot authorize a message you created. Please have another user (Checker) authorize it.'
      });
    }

    next();
  } catch (error) {
    logger.error('Maker/Checker validation error', { error: error.message });
    res.status(500).json({ success: false, message: 'Validation error' });
  }
};

/**
 * Check if user owns the resource
 */
export const checkOwnership = (resourceTable, idColumn = 'id') => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const resourceId = req.params.id || req.params[Object.keys(req.params)[0]];

      if (!resourceId) {
        return next();
      }

      // Check ownership
      const result = await query(
        `SELECT created_by FROM ${resourceTable} WHERE ${idColumn} = $1`,
        [resourceId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Resource not found' });
      }

      const resource = result.rows[0];

      // Admin can access any resource
      if (user.role === 'admin') {
        return next();
      }

      // Check if user owns the resource
      if (resource.created_by !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership check error', { error: error.message });
      res.status(500).json({ success: false, message: 'Validation error' });
    }
  };
};

export default { rbac, makerChecker, checkOwnership };

