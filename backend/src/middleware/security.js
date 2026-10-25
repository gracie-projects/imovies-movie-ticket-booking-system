import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defence for cookie based sessions. Browsers only let a cross-origin page
 * send a custom header after a CORS preflight, which our CORS policy only
 * approves for trusted origins. Combined with SameSite cookies this blocks
 * forged form submissions from other sites.
 */
export function requireCsrfHeader(req, _res, next) {
  if (UNSAFE_METHODS.has(req.method) && req.get('X-Requested-With') !== 'XMLHttpRequest') {
    throw ApiError.forbidden('Missing CSRF header');
  }
  next();
}

const rateLimitHandler = (_req, _res, next, options) => {
  next(new ApiError(429, options.message));
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  handler: rateLimitHandler,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: 'Too many requests. Please slow down.',
  handler: rateLimitHandler,
});
