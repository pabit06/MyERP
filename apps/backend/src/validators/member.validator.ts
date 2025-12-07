/**
 * Member Validation Schemas
 * 
 * Validation schemas specific to member routes.
 * Re-exports shared schemas and adds route-specific validations.
 */

import { z } from 'zod';
import { createMemberSchema, updateMemberSchema, updateMemberStatusSchema } from '@myerp/shared-types';
import { idSchema } from './common.js';

// Re-export shared schemas
export { createMemberSchema, updateMemberSchema, updateMemberStatusSchema };

// Route parameter schemas
export const memberIdParamSchema = idSchema;

// Query parameter schemas for member listing
export const memberListQuerySchema = z.object({
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
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'application', 'under_review', 'approved', 'bod_pending', 'rejected']).optional(),
  memberType: z.enum(['INDIVIDUAL', 'INSTITUTION']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
