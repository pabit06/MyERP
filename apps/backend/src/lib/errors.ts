/**
 * Custom Error Classes for Application
 * 
 * Provides structured error handling with proper status codes,
 * error codes, and details for better debugging and user experience.
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 * Used when request data fails validation
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Not found error (404)
 * Used when a resource is not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, identifier });
  }
}

/**
 * Unauthorized error (401)
 * Used when authentication is required or failed
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error (403)
 * Used when user lacks permission to perform an action
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Conflict error (409)
 * Used when a resource conflict occurs (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Bad request error (400)
 * Used for general bad requests
 */
export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

/**
 * Internal server error (500)
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'An unexpected error occurred', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

/**
 * Service unavailable error (503)
 * Used when a service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: any) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

/**
 * Database error
 * Used for database-related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 500, 'DATABASE_ERROR', {
      originalError: originalError?.message,
    });
  }
}

/**
 * Business logic error
 * Used for domain-specific business rule violations
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', details);
  }
}

