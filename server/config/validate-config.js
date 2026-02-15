import { getEnvironmentInfo } from './environments.js';

class ConfigValidator {
  constructor() {
    this.environment = getEnvironmentInfo();
    this.errors = [];
    this.warnings = [];
  }

  // Validate database configuration
  validateDatabase() {
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    
    required.forEach(key => {
      if (!process.env[key]) {
        this.errors.push(`Database: Missing ${key}`);
      }
    });
    
    // Validate port
    const port = parseInt(process.env.DB_PORT || '5432');
    if (isNaN(port) || port < 1 || port > 65535) {
      this.errors.push('Database: Invalid DB_PORT value');
    }
    
    // Production-specific checks
    if (this.environment.isProduction) {
      if (process.env.DB_SSL !== 'true') {
        this.warnings.push('Database: SSL should be enabled in production');
      }
      
      if (process.env.DB_PASSWORD.length < 16) {
        this.warnings.push('Database: Password should be at least 16 characters in production');
      }
    }
  }

  // Validate security configuration
  validateSecurity() {
    // JWT Secret
    if (!process.env.JWT_SECRET) {
      this.errors.push('Security: JWT_SECRET is required');
    } else if (process.env.JWT_SECRET.length < 32) {
      this.warnings.push('Security: JWT_SECRET should be at least 32 characters');
    }
    
    // Check for default secrets
    const defaultSecrets = [
      'your_secret_key',
      'swiftnexus-secret-key-2024-change-this-in-production',
      'secret',
      'test'
    ];
    
    if (defaultSecrets.includes(process.env.JWT_SECRET)) {
      this.errors.push('Security: JWT_SECRET is using a default value');
    }
    
    // Bcrypt rounds
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    if (rounds < 10) {
      this.warnings.push('Security: BCRYPT_ROUNDS should be at least 10');
    }
    
    // Production security checks
    if (this.environment.isProduction) {
      if (process.env.BCRYPT_ROUNDS < 12) {
        this.warnings.push('Security: BCRYPT_ROUNDS should be at least 12 in production');
      }
      
      if (!process.env.SESSION_SECRET) {
        this.warnings.push('Security: SESSION_SECRET should be set in production');
      }
    }
  }

  // Validate API configuration
  validateAPI() {
    // CORS origin
    if (!process.env.CORS_ORIGIN) {
      this.errors.push('API: CORS_ORIGIN is required');
    }
    
    // Rate limiting
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
    
    if (isNaN(windowMs) || windowMs < 60000) {
      this.warnings.push('API: RATE_LIMIT_WINDOW_MS should be at least 60000 (1 minute)');
    }
    
    if (isNaN(maxRequests) || maxRequests < 1) {
      this.warnings.push('API: RATE_LIMIT_MAX_REQUESTS should be at least 1');
    }
    
    // Port configuration
    const port = parseInt(process.env.PORT || '5000');
    if (isNaN(port) || port < 1 || port > 65535) {
      this.errors.push('API: Invalid PORT value');
    }
  }

  // Validate external services
  validateExternalServices() {
    // Email service
    if (!process.env.RESEND_API_KEY) {
      this.warnings.push('External Services: RESEND_API_KEY not set (email features disabled)');
    }
    
    // NowPayments
    if (!process.env.NOWPAYMENTS_API_KEY) {
      this.warnings.push('External Services: NOWPAYMENTS_API_KEY not set (crypto deposits disabled)');
    }
    
    // Message queue
    if (!process.env.RABBITMQ_URL) {
      this.warnings.push('External Services: RABBITMQ_URL not set (message queue disabled)');
    }
    
    // Redis
    if (!process.env.REDIS_URL) {
      this.warnings.push('External Services: REDIS_URL not set (caching disabled)');
    }
  }

  // Validate logging configuration
  validateLogging() {
    const validLevels = ['error', 'warn', 'info', 'debug'];
    const logLevel = process.env.LOG_LEVEL || 'info';
    
    if (!validLevels.includes(logLevel)) {
      this.warnings.push(`Logging: Invalid LOG_LEVEL "${logLevel}". Valid levels: ${validLevels.join(', ')}`);
    }
    
    // Production logging checks
    if (this.environment.isProduction && logLevel === 'debug') {
      this.warnings.push('Logging: Debug logging should not be used in production');
    }
  }

  // Validate file upload configuration
  validateFileUploads() {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760');
    
    if (isNaN(maxSize) || maxSize < 1024) {
      this.warnings.push('File Uploads: MAX_FILE_SIZE should be at least 1024 bytes');
    }
    
    if (!process.env.UPLOAD_PATH) {
      this.warnings.push('File Uploads: UPLOAD_PATH not set, using default');
    }
    
    // Production checks
    if (this.environment.isProduction) {
      if (maxSize > 104857600) { // 100MB
        this.warnings.push('File Uploads: MAX_FILE_SIZE should not exceed 100MB in production');
      }
    }
  }

  // Run all validations
  validate() {
    console.log('🔍 Validating configuration...');
    
    this.validateDatabase();
    this.validateSecurity();
    this.validateAPI();
    this.validateExternalServices();
    this.validateLogging();
    this.validateFileUploads();
    
    return this.getReport();
  }

  // Get validation report
  getReport() {
    const report = {
      environment: this.environment.name,
      timestamp: new Date().toISOString(),
      errors: this.errors,
      warnings: this.warnings,
      isValid: this.errors.length === 0,
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        total: this.errors.length + this.warnings.length
      }
    };
    
    // Print report
    this.printReport(report);
    
    return report;
  }

  // Print validation report to console
  printReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log(`📋 Configuration Validation Report`);
    console.log(`🌍 Environment: ${report.environment.toUpperCase()}`);
    console.log(`⏰ Timestamp: ${report.timestamp}`);
    console.log('='.repeat(60));
    
    if (report.errors.length > 0) {
      console.log(`\n❌ ERRORS (${report.errors.length}):`);
      report.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (report.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${report.warnings.length}):`);
      report.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    if (report.errors.length === 0 && report.warnings.length === 0) {
      console.log('\n✅ Configuration is valid!');
    } else {
      console.log(`\n📊 Summary: ${report.summary.errors} errors, ${report.summary.warnings} warnings`);
    }
    
    console.log('='.repeat(60));
    
    if (report.errors.length > 0) {
      console.log('\n💡 Please fix the errors before starting the application.');
      process.exit(1);
    }
  }
}

// Export validator class and convenience function
export default ConfigValidator;

export function validateConfiguration() {
  const validator = new ConfigValidator();
  return validator.validate();
}
