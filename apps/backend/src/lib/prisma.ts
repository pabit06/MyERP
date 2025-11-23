import { prisma } from '@myerp/db-schema';

// Re-export prisma client for use in backend
export { prisma };

// Tenant-scoped Prisma client wrapper
// This will be enhanced with middleware in the next step
export const getTenantPrisma = (tenantId: string) => {
  // For now, return the regular prisma client
  // We'll add middleware to automatically scope queries
  return prisma;
};
