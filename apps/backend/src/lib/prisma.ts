import { prisma as basePrisma } from '@myerp/db-schema';
import { recordQuery } from './database-metrics.js';
import { logger } from '../config/index.js';

// Add query logging middleware to track performance
basePrisma.$use(async (params, next) => {
  const startTime = Date.now();
  const result = await next(params);
  const duration = Date.now() - startTime;

  // Record query metrics
  recordQuery(duration);

  // Log slow queries (> 1 second)
  if (duration > 1000) {
    logger.warn('Slow database query detected', {
      model: params.model,
      action: params.action,
      duration,
      args: params.args,
    });
  }

  return result;
});

// Re-export prisma client for use in backend
export const prisma = basePrisma;

// Tenant-scoped Prisma client wrapper
// This will be enhanced with middleware in the next step
export const getTenantPrisma = (tenantId: string) => {
  // For now, return the regular prisma client
  // We'll add middleware to automatically scope queries
  return prisma;
};
