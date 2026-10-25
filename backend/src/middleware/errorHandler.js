import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let error = err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    error = ApiError.badRequest(details[0]?.message || 'Validation failed', details);
  } else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid value for ${err.path}`);
  } else if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    error = ApiError.conflict(`A record with this ${field} already exists`);
  } else if (err?.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body');
  } else if (err?.type === 'entity.too.large') {
    error = new ApiError(413, 'Request body too large');
  } else if (!(err instanceof ApiError)) {
    logger.error({ err, path: req.originalUrl }, 'Unhandled error');
    error = new ApiError(500, 'Something went wrong. Please try again.');
  }

  if (error.statusCode >= 500 && err instanceof ApiError) {
    logger.error({ err, path: req.originalUrl }, error.message);
  }

  const body = { success: false, message: error.message };
  if (error.details) body.details = error.details;
  res.status(error.statusCode).json(body);
}
