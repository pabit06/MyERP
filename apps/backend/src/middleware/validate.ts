/**
 * Request Validation Middleware
 *
 * Provides automatic request validation using Zod schemas.
 * Validates request body, query parameters, and route parameters.
 *
 * Usage:
 *   router.post('/members', validate(createMemberSchema), createMember);
 *   router.get('/members', validateQuery(paginationSchema), getMembers);
 *   router.get('/members/:id', validateParams(idSchema), getMember);
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../lib/errors.js';
import { asyncHandler } from './error-handler.js';

/**
 * Validate request body
 *
 * @param schema - Zod schema to validate against
 * @returns Middleware function
 *
 * @example
 * router.post('/members', validate(createMemberSchema), createMember);
 */
export function validate<T extends ZodSchema>(schema: T) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        throw new ValidationError('Validation failed', result.error.errors);
      }

      // Attach validated data to request
      req.validated = result.data as z.infer<T>;
      next();
    } catch (error) {
      // Re-throw ValidationError to be handled by error middleware
      if (error instanceof ValidationError) {
        throw error;
      }
      // Wrap Zod errors
      if (error instanceof ZodError) {
        throw new ValidationError('Validation failed', error.errors);
      }
      throw error;
    }
  });
}

/**
 * Validate request query parameters
 *
 * @param schema - Zod schema to validate against
 * @returns Middleware function
 *
 * @example
 * router.get('/members', validateQuery(paginationSchema), getMembers);
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        throw new ValidationError('Invalid query parameters', result.error.errors);
      }

      // Attach validated query to request
      req.validatedQuery = result.data as z.infer<T>;
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid query parameters', error.errors);
      }
      throw error;
    }
  });
}

/**
 * Validate route parameters
 *
 * @param schema - Zod schema to validate against
 * @returns Middleware function
 *
 * @example
 * router.get('/members/:id', validateParams(z.object({ id: z.string() })), getMember);
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        throw new ValidationError('Invalid route parameters', result.error.errors);
      }

      // Attach validated params to request
      req.validatedParams = result.data as z.infer<T>;
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid route parameters', error.errors);
      }
      throw error;
    }
  });
}

/**
 * Validate multiple parts of the request at once
 *
 * @param options - Object with body, query, and/or params schemas
 * @returns Middleware function
 *
 * @example
 * router.post('/members/:id/kyc',
 *   validateAll({
 *     params: z.object({ id: z.string() }),
 *     body: KymFormSchema
 *   }),
 *   updateKyc
 * );
 */
export function validateAll<
  TBody extends ZodSchema,
  TQuery extends ZodSchema,
  TParams extends ZodSchema,
>(options: { body?: TBody; query?: TQuery; params?: TParams }) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (options.body) {
        const bodyResult = options.body.safeParse(req.body);
        if (!bodyResult.success) {
          throw new ValidationError('Validation failed', bodyResult.error.errors);
        }
        req.validated = bodyResult.data as z.infer<TBody>;
      }

      // Validate query
      if (options.query) {
        const queryResult = options.query.safeParse(req.query);
        if (!queryResult.success) {
          throw new ValidationError('Invalid query parameters', queryResult.error.errors);
        }
        req.validatedQuery = queryResult.data as z.infer<TQuery>;
      }

      // Validate params
      if (options.params) {
        const paramsResult = options.params.safeParse(req.params);
        if (!paramsResult.success) {
          throw new ValidationError('Invalid route parameters', paramsResult.error.errors);
        }
        req.validatedParams = paramsResult.data as z.infer<TParams>;
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof ZodError) {
        throw new ValidationError('Validation failed', error.errors);
      }
      throw error;
    }
  });
}
