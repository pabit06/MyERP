import { prisma } from './prisma.js';
import { Request } from 'express';

export interface AuditLogData {
  cooperativeId: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        cooperativeId: data.cooperativeId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.userId,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Create audit log from Express request
 */
export async function auditLogFromRequest(
  req: Request,
  action: string,
  entityType: string,
  entityId?: string,
  details?: any
): Promise<void> {
  const user = (req as any).user;
  if (!user) return;

  await createAuditLog({
    cooperativeId: user.tenantId,
    action,
    entityType,
    entityId,
    userId: user.id,
    details,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  });
}
