import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

// Type assertion for extended prisma client
type ExtendedPrismaClient = typeof prisma;
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  type Permission,
} from '../lib/permissions.js';

/**
 * Hook context passed to lifecycle hooks
 */
export interface HookContext {
  tx: Prisma.TransactionClient;
  userId?: string;
  tenantId: string;
  originalData?: any;
  metadata?: Record<string, any>;
}

/**
 * Base Controller class providing common patterns for all domain controllers
 */
export abstract class BaseController {
  protected prisma: ExtendedPrismaClient;

  constructor() {
    this.prisma = prisma as ExtendedPrismaClient;
  }

  /**
   * Validate that a tenant/cooperative exists and is accessible
   */
  protected async validateTenant(tenantId: string): Promise<void> {
    const cooperative = await this.prisma.cooperative.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!cooperative) {
      throw new Error(`Cooperative not found: ${tenantId}`);
    }
  }

  /**
   * Execute a function within a Prisma transaction
   * Provides transaction client to the function
   */
  protected async handleTransaction<T>(
    fn: (tx: any) => Promise<T> // Using any to support extended Prisma client transaction
  ): Promise<T> {
    return (await this.prisma.$transaction(fn, {
      maxWait: 10000, // 10 seconds
      timeout: 30000, // 30 seconds
    })) as T;
  }

  /**
   * Validate user permissions for an action
   * Can be overridden by subclasses for domain-specific permissions
   *
   * @param userId - User ID
   * @param tenantId - Tenant/Cooperative ID
   * @param permission - Permission string (e.g., "members:view", "loans:approve")
   * @returns true if user has permission, false otherwise
   */
  protected async validatePermissions(
    userId: string,
    tenantId: string,
    permission: Permission
  ): Promise<boolean> {
    return await hasPermission(userId, tenantId, permission);
  }

  /**
   * Validate user has any of the specified permissions
   */
  protected async validateAnyPermission(
    userId: string,
    tenantId: string,
    permissions: Permission[]
  ): Promise<boolean> {
    return await hasAnyPermission(userId, tenantId, permissions);
  }

  /**
   * Validate user has all of the specified permissions
   */
  protected async validateAllPermissions(
    userId: string,
    tenantId: string,
    permissions: Permission[]
  ): Promise<boolean> {
    return await hasAllPermissions(userId, tenantId, permissions);
  }

  /**
   * Validate user has a specific role
   */
  protected async validateRole(
    userId: string,
    tenantId: string,
    roleName: string
  ): Promise<boolean> {
    return await hasRole(userId, tenantId, roleName);
  }

  /**
   * Validate user has any of the specified roles
   */
  protected async validateAnyRole(
    userId: string,
    tenantId: string,
    roleNames: string[]
  ): Promise<boolean> {
    return await hasAnyRole(userId, tenantId, roleNames);
  }

  /**
   * Require permission - throws error if user doesn't have permission
   */
  protected async requirePermission(
    userId: string,
    tenantId: string,
    permission: Permission,
    errorMessage?: string
  ): Promise<void> {
    const hasAccess = await this.validatePermissions(userId, tenantId, permission);
    if (!hasAccess) {
      throw new Error(errorMessage || `Access denied: Requires permission '${permission}'`);
    }
  }

  /**
   * Require any permission - throws error if user doesn't have any of the permissions
   */
  protected async requireAnyPermission(
    userId: string,
    tenantId: string,
    permissions: Permission[],
    errorMessage?: string
  ): Promise<void> {
    const hasAccess = await this.validateAnyPermission(userId, tenantId, permissions);
    if (!hasAccess) {
      throw new Error(
        errorMessage || `Access denied: Requires one of permissions: ${permissions.join(', ')}`
      );
    }
  }

  /**
   * Require role - throws error if user doesn't have the role
   */
  protected async requireRole(
    userId: string,
    tenantId: string,
    roleName: string,
    errorMessage?: string
  ): Promise<void> {
    const hasAccess = await this.validateRole(userId, tenantId, roleName);
    if (!hasAccess) {
      throw new Error(errorMessage || `Access denied: Requires role '${roleName}'`);
    }
  }

  /**
   * Create a hook context for lifecycle hooks
   */
  protected createHookContext(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId?: string,
    originalData?: any,
    metadata?: Record<string, any>
  ): HookContext {
    return {
      tx,
      userId,
      tenantId,
      originalData,
      metadata,
    };
  }

  /**
   * Standard error handler - can be overridden by subclasses
   */
  protected handleError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }

  /**
   * Validate required fields in data object
   */
  protected validateRequired(data: Record<string, any>, fields: string[]): void {
    const missing = fields.filter((field) => data[field] === undefined || data[field] === null);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }
}
