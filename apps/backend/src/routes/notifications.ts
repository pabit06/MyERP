import { Router, Request, Response } from 'express';
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

const router: Router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

/**
 * GET /api/notifications
 * Get notifications for the current user or cooperative
 * Query params:
 *   - type: Filter by notification type
 *   - channel: Filter by channel (SMS, EMAIL, IN_APP, PUSH)
 *   - status: Filter by status (PENDING, SENT, FAILED, READ)
 *   - unreadOnly: Only return unread notifications (true/false)
 *   - limit: Number of notifications to return (default: 50)
 *   - offset: Offset for pagination (default: 0)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { type, channel, status, unreadOnly, limit, offset } = req.query;

    const options: NotificationQueryOptions = {
      cooperativeId,
      userId, // Get notifications for current user
      type: type as string | undefined,
      channel: channel ? (channel as NotificationChannel) : undefined,
      status: status ? (status as NotificationStatus) : undefined,
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    };

    const result = await getNotifications(options);

    res.json({
      notifications: result.notifications,
      total: result.total,
      limit: options.limit,
      offset: options.offset,
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message || 'Failed to get notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for the current user
 */
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    const userId = req.user!.userId;

    const count = await getUnreadCount(cooperativeId, userId);

    res.json({ count });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: error.message || 'Failed to get unread count' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await markAsRead(id, userId);

    res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    if (
      error.message === 'Notification not found' ||
      error.message === 'Notification does not belong to user'
    ) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Failed to mark notification as read' });
    }
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the current user
 */
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    const userId = req.user!.userId;

    const count = await markAllAsRead(cooperativeId, userId);

    res.json({
      message: 'All notifications marked as read',
      count,
    });
  } catch (error: any) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark all notifications as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await deleteNotification(id, userId);

    res.json({ message: 'Notification deleted' });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    if (
      error.message === 'Notification not found' ||
      error.message === 'Notification does not belong to user'
    ) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Failed to delete notification' });
    }
  }
});

export default router;
