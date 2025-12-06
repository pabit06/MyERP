/**
 * Enhanced Error Handling Middleware
 * 
 * Provides consistent error responses and proper logging
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../config/index.js';
import { env } from '../config/index.js';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { captureException, setSentryUser, clearSentryUser } from '../config/sentry.js';

/**
 * Enhanced error handling middleware
 * Should be used as the last middleware in the Express app
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Set user context for Sentry if available
  if (req.user?.userId) {
    setSentryUser(req.user.userId, req.user.email, req.user.tenantId);
  }

  // Handle known application errors
  if (err instanceof AppError) {
    logger.error('Application error', {
      error: err.message,
      code: err.code,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      tenantId: req.user?.tenantId,
      details: err.details,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    });

    // Only send to Sentry for server errors (5xx)
    if (err.statusCode >= 500) {
      captureException(err, {
        code: err.code,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
        tenantId: req.user?.tenantId,
        details: err.details,
      });
    }

    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(env.NODE_ENV === 'development' && err.details && { details: err.details }),
    });
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, req, res);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma validation error', {
      error: err.message,
      path: req.path,
      method: req.method,
    });

    return res.status(400).json({
      error: 'Invalid data provided',
      code: 'VALIDATION_ERROR',
      ...(env.NODE_ENV === 'development' && { details: err.message }),
    });
  }

  // Handle unknown errors
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    tenantId: req.user?.tenantId,
  });

  // Send to Sentry
  captureException(err, {
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    tenantId: req.user?.tenantId,
  });

  res.status(500).json({
    error: 'An unexpected error occurred',
    ...(env.NODE_ENV === 'development' && { message: err.message }),
  });
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(
  err: Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response
) {
  logger.error('Prisma error', {
    code: err.code,
    error: err.message,
    path: req.path,
    method: req.method,
  });

  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      const target = (err.meta?.target as string[]) || [];
      return res.status(409).json({
        error: `A record with this ${target.join(', ')} already exists`,
        code: 'CONFLICT',
        ...(env.NODE_ENV === 'development' && { details: err.meta }),
      });

    case 'P2025':
      // Record not found
      return res.status(404).json({
        error: 'Record not found',
        code: 'NOT_FOUND',
      });

    case 'P2003':
      // Foreign key constraint violation
      return res.status(400).json({
        error: 'Invalid reference to related record',
        code: 'BAD_REQUEST',
        ...(env.NODE_ENV === 'development' && { details: err.meta }),
      });

    case 'P2014':
      // Required relation violation
      return res.status(400).json({
        error: 'Required relation is missing',
        code: 'BAD_REQUEST',
        ...(env.NODE_ENV === 'development' && { details: err.meta }),
      });

    default:
      return res.status(500).json({
        error: 'Database error occurred',
        code: 'DATABASE_ERROR',
        ...(env.NODE_ENV === 'development' && { message: err.message }),
      });
  }
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * Should be used after all routes but before error handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
}

