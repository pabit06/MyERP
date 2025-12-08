import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  NotificationQueryOptions,
} from '../lib/notifications.js';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { idSchema, paginationSchema } from '../validators/common.js';
import { createPaginatedResponse } from '../lib/pagination.js';

const router: Router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

/**
 * GET /api/notifications
 * Get notifications for the current user or cooperative (with pagination)
 * Query params:
 *   - type: Filter by notification type
 *   - channel: Filter by channel (SMS, EMAIL, IN_APP, PUSH)
 *   - status: Filter by status (PENDING, SENT, FAILED, READ)
 *   - unreadOnly: Only return unread notifications (true/false)
 *   - page: Page number (default: 1)
 *   - limit: Number of notifications per page (default: 20, max: 100)
 */
router.get(
  '/',
  validateQuery(
    paginationSchema.extend({
      type: z.string().optional(),
      channel: z.nativeEnum(NotificationChannel).optional(),
      status: z.nativeEnum(NotificationStatus).optional(),
      unreadOnly: z
        .string()
        .transform((val) => val === 'true')
        .optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;
    const { page, limit, type, channel, status, unreadOnly, sortOrder } = req.validatedQuery!;

    const offset = (page - 1) * limit;

    const options: NotificationQueryOptions = {
      cooperativeId,
      userId, // Get notifications for current user
      type: type as string | undefined,
      channel: channel as NotificationChannel | undefined,
      status: status as NotificationStatus | undefined,
      unreadOnly: unreadOnly || false,
      limit,
      offset,
    };

    const result = await getNotifications(options);

    res.json(
      createPaginatedResponse(result.notifications, result.total, {
        page,
        limit,
        sortOrder: sortOrder || 'desc',
      })
    );
  })
);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for the current user
 */
router.get(
  '/unread-count',
  asyncHandler(async (req: Request, res: Response) => {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;

    const count = await getUnreadCount(cooperativeId!, userId);

    res.json({ count });
  })
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the current user
 * NOTE: This route must be defined before /:id/read to avoid route matching conflicts
 */
router.put(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;

    const count = await markAllAsRead(cooperativeId!, userId);

    res.json({
      message: 'All notifications marked as read',
      count,
    });
  })
);

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put(
  '/:id/read',
  validateParams(idSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const cooperativeId = req.user!.tenantId || req.currentCooperativeId;
    if (!cooperativeId) {
      res.status(400).json({ error: 'Cooperative ID is required' });
      return;
    }
    const { id } = req.validatedParams!;

    await markAsRead(id, userId, cooperativeId);

    res.json({ message: 'Notification marked as read' });
  })
);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete(
  '/:id',
  validateParams(idSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const cooperativeId = req.user!.tenantId || req.currentCooperativeId;
    if (!cooperativeId) {
      res.status(400).json({ error: 'Cooperative ID is required' });
      return;
    }
    const { id } = req.validatedParams!;

    await deleteNotification(id, userId, cooperativeId);

    res.json({ message: 'Notification deleted' });
  })
);

/**
 * POST /api/notifications/bulk
 * Send bulk notifications to members
 */
router.post(
  '/bulk',
  validate(
    z.object({
      channel: z.enum(['SMS', 'EMAIL', 'IN_APP', 'PUSH']),
      target: z.enum(['ALL_MEMBERS', 'SPECIFIC_MEMBERS']),
      memberIds: z.array(z.string()).optional(), // Required if target is SPECIFIC_MEMBERS
      title: z.string().min(1),
      message: z.string().min(1),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { channel, target, memberIds, title, message } = req.validated!;
    const { prisma } = await import('../lib/prisma.js'); // Import prisma if not available in scope or use req.prisma if available
    const { sendBulkNotification } = await import('../lib/notifications.js');

    // 1. Fetch Recipients
    let recipients: Array<{ userId?: string; phone?: string; email?: string; name?: string }> = [];

    if (target === 'ALL_MEMBERS') {
      const members = await prisma.member.findMany({
        where: { cooperativeId, isActive: true },
        select: { id: true, phone: true, email: true, fullName: true },
      });

      // Map members to recipient format
      recipients = members.map((m) => ({
        // userId: undefined, // Members don't have direct User accounts yet
        phone: m.phone || undefined,
        email: m.email || undefined,
        name: m.fullName || undefined,
      }));
    } else if (target === 'SPECIFIC_MEMBERS' && memberIds && memberIds.length > 0) {
      const members = await prisma.member.findMany({
        where: { cooperativeId, id: { in: memberIds } },
        select: { id: true, phone: true, email: true, fullName: true },
      });
      recipients = members.map((m) => ({
        phone: m.phone || undefined,
        email: m.email || undefined,
        name: m.fullName || undefined,
      }));
    } else {
      res.status(400).json({ error: 'Invalid target or missing memberIds' });
      return;
    }

    if (recipients.length === 0) {
      res.status(400).json({ error: 'No valid recipients found' });
      return;
    }

    // 2. Send Bulk
    const result = await sendBulkNotification(
      cooperativeId,
      channel as 'SMS' | 'EMAIL' | 'IN_APP' | 'PUSH',
      recipients,
      title,
      message
    );

    res.json({
      message: 'Bulk notification process completed',
      details: result,
    });
  })
);

export default router;
