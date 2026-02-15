/**
 * Environment Validation for SwiftNexus Enterprise
 * Enhanced with Production Security Checks
 */

const validateEnv = () => {
  console.log('🔍 Validating environment variables...');
  
  // Required variables for all environments
  const required = [
    'DB_HOST',
    'DB_PORT', 
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'PORT',
    'NODE_ENV'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }

  // Type validation
  const port = parseInt(process.env.PORT);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('❌ PORT must be a number between 1-65535');
    process.exit(1);
  }

  const dbPort = parseInt(process.env.DB_PORT);
  if (isNaN(dbPort) || dbPort < 1 || dbPort > 65535) {
    console.error('❌ DB_PORT must be a number between 1-65535');
    process.exit(1);
  }

  // Environment validation
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    console.error('❌ NODE_ENV must be one of:', validEnvs);
    process.exit(1);
  }

  // Production-specific security checks
  if (process.env.NODE_ENV === 'production') {
    console.log('🔒 Running production security checks...');
    
    // JWT Secret validation
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      console.error('❌ JWT_SECRET must be at least 32 characters in production');
      process.exit(1);
    }

    // Check for default/weak passwords
    const defaultPasswords = [
      'Payday@2023@@@',
      'password',
      'admin',
      '123456',
      'root'
    ];
    
    if (defaultPasswords.includes(process.env.DB_PASSWORD)) {
      console.error('❌ Please change default database password for production');
      process.exit(1);
    }

    // Database host validation
    if (process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1') {
      console.warn('⚠️  Using localhost for database in production - consider using production database host');
    }

    // CORS validation
    if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.includes('localhost')) {
      console.warn('⚠️  Using localhost in CORS_ORIGIN for production - update to production domain');
    }

    // Log level validation
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (process.env.LOG_LEVEL && !validLogLevels.includes(process.env.LOG_LEVEL)) {
      console.error('❌ LOG_LEVEL must be one of:', validLogLevels);
      process.exit(1);
    }

    // JWT expiration validation
    if (process.env.JWT_EXPIRES_IN) {
      const jwtExpiry = process.env.JWT_EXPIRES_IN;
      if (jwtExpiry.includes('d') && parseInt(jwtExpiry) > 7) {
        console.warn('⚠️  JWT expiration longer than 7 days in production - consider shorter expiry');
      }
    }
  }

  // Optional variables validation
  const optional = [
    'CORS_ORIGIN',
    'RABBITMQ_URL',
    'LOG_LEVEL',
    'JWT_EXPIRES_IN',
    'RESEND_API_KEY',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'NOWPAYMENTS_API_KEY',
    'NOWPAYMENTS_API_SECRET'
  ];

  const missingOptional = optional.filter(key => !process.env[key]);
  if (missingOptional.length > 0) {
    console.log('ℹ️  Optional environment variables not set:', missingOptional);
  }

  console.log('✅ Environment validation passed successfully');
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 Server Port: ${process.env.PORT}`);
  console.log(`🗄️  Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
};

export default validateEnv;
