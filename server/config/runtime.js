'use strict';

function validateRuntime(env = process.env) {
  const errors = [];
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) errors.push('JWT_SECRET must be at least 32 characters');
  if (!env.DATABASE_URL && !env.DB_NAME) errors.push('DATABASE_URL or DB_NAME is required');
  if (env.NODE_ENV === 'production' && !env.DATABASE_URL && !env.DB_PASSWORD) errors.push('Production DB_PASSWORD is required');
  if (errors.length) throw new Error(`Invalid runtime configuration: ${errors.join('; ')}`);
  return Object.freeze({ nodeEnv: env.NODE_ENV || 'development' });
}

module.exports = { validateRuntime };
