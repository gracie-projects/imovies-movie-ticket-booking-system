import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req[source] against a zod schema and replaces it with the parsed
 * (trimmed / coerced) value. Unknown keys are stripped.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw ApiError.badRequest(errors[0]?.message || 'Invalid request', errors);
    }
    // req.query is a getter in Express 5, so store parsed values separately
    if (source === 'query') req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
}
