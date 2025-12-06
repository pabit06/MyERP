/**
 * Common Validation Schemas
 * 
 * Reusable Zod schemas for common validation patterns:
 * - Pagination
 * - Date ranges
 * - ID parameters
 * - Common query filters
 */

import { z } from 'zod';

/**
 * Pagination schema for query parameters
 * 
 * @example
 * router.get('/members', validateQuery(paginationSchema), getMembers);
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1).default(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100).default(20)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

/**
 * ID parameter schema
 * 
 * @example
 * router.get('/members/:id', validateParams(idSchema), getMember);
 */
export const idSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

/**
 * Date range schema for filtering
 */
export const dateRangeSchema = z.object({
  startDate: z
    .string()
    .datetime()
    .or(z.date())
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .datetime()
    .or(z.date())
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }
);

/**
 * Search/filter schema
 */
export const searchSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  filter: z.record(z.any()).optional(), // Generic filter object
});

/**
 * Combined pagination and search schema
 */
export const paginationWithSearchSchema = paginationSchema.merge(searchSchema);

/**
 * Fiscal year schema
 */
export const fiscalYearSchema = z.object({
  fiscalYear: z.string().regex(/^\d{4}\/\d{2}$/, 'Fiscal year must be in format YYYY/YY'),
});

/**
 * Month schema (1-12)
 */
export const monthSchema = z.object({
  month: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1).max(12).optional()),
  monthBs: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1).max(12).optional()),
});

/**
 * Common status filter schema
 */
export const statusFilterSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending', 'approved', 'rejected']).optional(),
});

/**
 * Helper to create paginated response type
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
