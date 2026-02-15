import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Get environment information
 */
export const getEnvironmentInfo = () => {
  return {
    name: process.env.NODE_ENV || 'development',
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      name: process.env.DB_NAME || 'swiftnexus'
    },
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development'
  };
};

/**
 * Load environment configuration
 */
export const loadEnvironmentConfig = () => {
  return {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      name: process.env.DB_NAME || 'swiftnexus',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true'
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    server: {
      port: parseInt(process.env.PORT) || 5000,
      nodeEnv: process.env.NODE_ENV || 'development',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
    }
  };
};

/**
 * Validate environment configuration
 */
export const validateEnvironment = () => {
  const errors = [];
  
  if (!process.env.DB_HOST) errors.push('DB_HOST is required');
  if (!process.env.DB_NAME) errors.push('DB_NAME is required');
  if (!process.env.DB_USER) errors.push('DB_USER is required');
  if (!process.env.JWT_SECRET) errors.push('JWT_SECRET is required');
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }
  
  return true;
};
