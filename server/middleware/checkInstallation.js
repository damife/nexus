import { query } from '../config/database.js';
import logger from '../config/logger.js';

export const checkInstallation = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = $1',
      ['public']
    );
    
    const tableCount = parseInt(result.rows[0].count);
    
    if (tableCount === 0) {
      return res.status(503).json({
        success: false,
        message: 'Database not installed',
        redirectTo: '/install'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Installation check error', { error: error.message });
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      redirectTo: '/install'
    });
  }
};

export default checkInstallation;

