/**
 * Audit Logging System
 *
 * Logs all sensitive operations for security and compliance:
 * - Login attempts (success/failure)
 * - Permission changes
 * - Financial transactions
 * - Data exports
 * - Admin actions
 * - User management operations
 */

import { prisma } from './prisma.js';
import { logger } from '../config/index.js';
import { captureMessage } from '../config/sentry.js';

export enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',

  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',

  // Permission Management
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',

  // Financial Operations
  TRANSACTION_CREATED = 'TRANSACTION_CREATED',
  TRANSACTION_MODIFIED = 'TRANSACTION_MODIFIED',
  TRANSACTION_DELETED = 'TRANSACTION_DELETED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',

  // Data Operations
  DATA_EXPORTED = 'DATA_EXPORTED',
  DATA_IMPORTED = 'DATA_IMPORTED',
  DATA_DELETED = 'DATA_DELETED',
  BULK_OPERATION = 'BULK_OPERATION',

  // System Administration
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_RESTORE = 'SYSTEM_RESTORE',

  // Member Operations
  MEMBER_CREATED = 'MEMBER_CREATED',
  MEMBER_UPDATED = 'MEMBER_UPDATED',
  MEMBER_ACTIVATED = 'MEMBER_ACTIVATED',
  MEMBER_DELETED = 'MEMBER_DELETED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',

  // Compliance
  COMPLIANCE_ALERT = 'COMPLIANCE_ALERT',
  COMPLIANCE_REVIEW = 'COMPLIANCE_REVIEW',
  AML_FLAG = 'AML_FLAG',
}

export interface AuditLogData {
  action: AuditAction;
  userId?: string;
  tenantId?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Create an audit log entry
 *
 * @param data - Audit log data
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    if (!data.tenantId) {
      logger.warn('Audit log requires tenantId', { action: data.action });
      return;
    }

    // Log to database (matching schema structure)
    await prisma.auditLog.create({
      data: {
        cooperativeId: data.tenantId, // Schema uses cooperativeId
        action: data.action,
        entityType: data.resourceType || 'unknown',
        entityId: data.resourceId,
        userId: data.userId,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: new Date(),
      },
    });

    // Also log to Winston logger
    const logLevel = data.success === false ? 'error' : 'info';
    logger[logLevel]('Audit log', {
      action: data.action,
      userId: data.userId,
      cooperativeId: data.tenantId,
      entityType: data.resourceType,
      entityId: data.resourceId,
      ipAddress: data.ipAddress,
      success: data.success,
    });

    // Send critical actions to Sentry
    if (data.success === false || isCriticalAction(data.action)) {
      captureMessage(`Audit: ${data.action}`, data.success === false ? 'error' : 'warning', {
        action: data.action,
        userId: data.userId,
        cooperativeId: data.tenantId,
        entityType: data.resourceType,
        entityId: data.resourceId,
        details: data.details,
      });
    }
  } catch (error: any) {
    // Don't throw - audit logging should never break the application
    logger.error('Failed to create audit log', {
      error: error.message,
      action: data.action,
    });
  }
}

/**
 * Check if an action is critical and should be sent to Sentry
 */
function isCriticalAction(action: AuditAction): boolean {
  const criticalActions = [
    AuditAction.LOGIN_FAILURE,
    AuditAction.PERMISSION_GRANTED,
    AuditAction.PERMISSION_REVOKED,
    AuditAction.TRANSACTION_DELETED,
    AuditAction.DATA_DELETED,
    AuditAction.SYSTEM_BACKUP,
    AuditAction.SYSTEM_RESTORE,
    AuditAction.AML_FLAG,
    AuditAction.COMPLIANCE_ALERT,
  ];
  return criticalActions.includes(action);
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(filters: {
  userId?: string;
  tenantId?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  page?: number;
  limit?: number;
}) {
  const {
    userId,
    tenantId,
    action,
    resourceType,
    resourceId,
    startDate,
    endDate,
    success,
    page = 1,
    limit = 50,
  } = filters;

  const where: any = {};

  if (userId) where.userId = userId;
  if (tenantId) where.tenantId = tenantId;
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;
  if (success !== undefined) where.success = success;
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      // Note: User relation may not exist in schema, adjust if needed
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
