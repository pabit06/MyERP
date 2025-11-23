import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

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
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
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
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      maxWait: 10000, // 10 seconds
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Validate user permissions for an action
   * Can be overridden by subclasses for domain-specific permissions
   */
  protected async validatePermissions(
    userId: string,
    tenantId: string,
    action: string
  ): Promise<boolean> {
    // Basic implementation - can be extended with role-based checks
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.cooperativeId !== tenantId || !user.isActive) {
      return false;
    }

    // TODO: Implement role-based permission checks
    // For now, return true if user exists and is active
    return true;
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

