/**
 * Pagination Utilities
 *
 * Helper functions for implementing pagination in routes
 */

import { PaginatedResponse, PaginationQuery } from '../validators/common.js';

/**
 * Apply pagination to a Prisma query
 *
 * @param query - Prisma query object
 * @param pagination - Pagination parameters
 * @returns Query with pagination applied
 */
export function applyPagination<T>(
  query: T,
  pagination: PaginationQuery
): T & { skip: number; take: number } {
  const skip = (pagination.page - 1) * pagination.limit;
  const take = pagination.limit;

  return {
    ...query,
    skip,
    take,
  } as T & { skip: number; take: number };
}

/**
 * Create paginated response
 *
 * @param data - Array of data items
 * @param total - Total number of items
 * @param pagination - Pagination parameters
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationQuery
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
  };
}

/**
 * Apply sorting to a Prisma query
 *
 * @param query - Prisma query object
 * @param sortBy - Field to sort by
 * @param sortOrder - Sort order (asc/desc)
 * @param defaultSort - Default sort field if sortBy not provided
 * @returns Query with sorting applied
 */
export function applySorting<T>(
  query: T,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc',
  defaultSort: string = 'createdAt'
): T & { orderBy: Record<string, 'asc' | 'desc'> } {
  const orderByField = sortBy || defaultSort;
  const order = sortOrder || 'desc';

  return {
    ...query,
    orderBy: {
      [orderByField]: order,
    },
  } as T & { orderBy: Record<string, 'asc' | 'desc'> };
}
