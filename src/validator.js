export function validateConfig(config) {
  const errors = [];

  // Basic validation
  if (!config.projectName || !config.projectName.trim()) {
    errors.push('Project name is required');
  }

  if (!config.framework) {
    errors.push('Framework is required');
  }

  if (!config.database) {
    errors.push('Database is required');
  }

  // Feature dependencies
  if (config.features.includes('otp') && !config.features.includes('jwt')) {
    errors.push('OTP verification requires JWT authentication');
  }

  if (config.features.includes('passwordReset') && !config.features.includes('jwt')) {
    errors.push('Password reset requires JWT authentication');
  }

  if ((config.features.includes('otp') || config.features.includes('passwordReset')) && 
      (!config.emailService || config.emailService === 'none')) {
    errors.push('Email service is required for OTP and password reset features');
  }

  // SQLite specific validations
  if (config.database === 'sqlite' && config.features.includes('redis')) {
    console.warn('⚠️  Warning: Using Redis with SQLite might be overkill for simple applications');
  }

  // Framework-specific validations
  if (config.framework !== 'express' && config.database === 'mongodb') {
    errors.push('MongoDB integration currently only supports Express.js');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}