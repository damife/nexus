import morgan from 'morgan';
import logger from '../config/logger.js';

// Custom stream for Morgan to use Winston
const stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Skip logging for health checks
const skip = (req, res) => {
  return res.statusCode < 400 && req.url === '/api/health';
};

// Custom format
const format = process.env.NODE_ENV === 'production' 
  ? 'combined' 
  : 'dev';

export default morgan(format, { stream, skip });

