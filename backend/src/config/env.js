import 'dotenv/config';

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const DEV_FALLBACK_SECRET = 'dev-only-insecure-jwt-secret-do-not-use-in-production';

function list(value, fallback) {
  return (value || fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  NODE_ENV,
  isProduction,
  isTest,
  PORT: Number(process.env.PORT) || 5000,
  // "memory" starts an in-memory MongoDB (development/testing only)
  MONGODB_URI: process.env.MONGODB_URI || 'memory',
  JWT_SECRET: process.env.JWT_SECRET || (isProduction ? '' : DEV_FALLBACK_SECRET),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
  CLIENT_ORIGINS: list(process.env.CLIENT_ORIGIN, 'http://localhost:5173,http://127.0.0.1:5173'),
  // "lax" when frontend and API share a site, "none" when they are on different domains (requires HTTPS)
  COOKIE_SAMESITE: (process.env.COOKIE_SAMESITE || 'lax').toLowerCase(),
  COOKIE_SECURE: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,
  TRUST_PROXY: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : isProduction ? 1 : 0,
  SEED_ON_START: process.env.SEED_ON_START === 'true',
  // Seed only when the database has no movies yet (safe for a first production deploy)
  SEED_IF_EMPTY: process.env.SEED_IF_EMPTY === 'true',
  // Demo deployments: automatically add the standard schedule for empty upcoming days
  SCHEDULE_AUTOFILL: process.env.SCHEDULE_AUTOFILL === 'true',
  SERVE_FRONTEND: process.env.SERVE_FRONTEND === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
  AUTH_RATE_LIMIT: Number(process.env.AUTH_RATE_LIMIT) || 20,
  SEED_UTC_OFFSET_MINUTES: Number(process.env.SEED_UTC_OFFSET_MINUTES ?? 330),
};

export function validateEnv() {
  const problems = [];
  if (isProduction) {
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
      problems.push('JWT_SECRET must be set to at least 32 characters in production');
    }
    if (env.MONGODB_URI === 'memory') {
      problems.push('MONGODB_URI must point to a persistent MongoDB deployment in production');
    }
  }
  if (!['lax', 'strict', 'none'].includes(env.COOKIE_SAMESITE)) {
    problems.push('COOKIE_SAMESITE must be one of: lax, strict, none');
  }
  if (env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
    problems.push('COOKIE_SAMESITE=none requires COOKIE_SECURE=true (HTTPS)');
  }
  if (problems.length) {
    throw new Error(`Invalid environment configuration:\n - ${problems.join('\n - ')}`);
  }
  return env;
}
