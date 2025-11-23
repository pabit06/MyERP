/**
 * Notification service for sending SMS, Email, and In-App notifications
 * Supports database storage for all notification types
 */

import { prisma } from './prisma.js';
import { NotificationChannel, NotificationStatus, Prisma } from '@prisma/client';

export interface NotificationData {
  cooperativeId: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  channel: 'SMS' | 'EMAIL' | 'IN_APP' | 'PUSH';
  phone?: string;
  email?: string;
  metadata?: Record<string, any>; // Additional data (e.g., meeting ID, transaction ID)
}

export interface NotificationQueryOptions {
  cooperativeId: string;
  userId?: string;
  type?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Create notification record in database
 */
async function createNotificationRecord(
  data: NotificationData,
  status: NotificationStatus = NotificationStatus.PENDING
): Promise<any> {
  return await prisma.notification.create({
    data: {
      cooperativeId: data.cooperativeId,
      userId: data.userId || null,
      type: data.type,
      channel: data.channel as NotificationChannel,
      title: data.title,
      message: data.message,
      phone: data.phone || null,
      email: data.email || null,
      metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      status,
    },
  });
}

/**
 * Update notification status
 */
async function updateNotificationStatus(
  notificationId: string,
  status: NotificationStatus,
  errorMessage?: string
): Promise<void> {
  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === NotificationStatus.SENT) {
    updateData.sentAt = new Date();
  }

  if (errorMessage) {
    updateData.errorMessage = errorMessage;
    updateData.retryCount = { increment: 1 };
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: updateData,
  });
}

/**
 * Send SMS notification
 * TODO: Integrate with actual SMS gateway
 */
export async function sendSMS(data: NotificationData): Promise<void> {
  if (!data.phone) {
    throw new Error('Phone number is required for SMS notification');
  }

  // Create notification record
  const notification = await createNotificationRecord(data, NotificationStatus.PENDING);

  try {
    // TODO: Integrate with SMS gateway (e.g., Twilio, Nexmo, local SMS provider)
    // Example:
    // await smsGateway.send({
    //   to: data.phone,
    //   message: data.message,
    // });

    // For now, log to console
    console.log(`[SMS Notification] To: ${data.phone}, Message: ${data.message}`);

    // Update status to SENT (in production, update after actual SMS is sent)
    await updateNotificationStatus(notification.id, NotificationStatus.SENT);
  } catch (error: any) {
    console.error(`[SMS Notification] Failed to send SMS:`, error);
    await updateNotificationStatus(
      notification.id,
      NotificationStatus.FAILED,
      error.message || 'Failed to send SMS'
    );
    throw error;
  }
}

/**
 * Send Email notification
 * TODO: Integrate with email service
 */
export async function sendEmail(data: NotificationData): Promise<void> {
  if (!data.email) {
    throw new Error('Email address is required for email notification');
  }

  // Create notification record
  const notification = await createNotificationRecord(data, NotificationStatus.PENDING);

  try {
    // TODO: Integrate with email service (e.g., SendGrid, AWS SES, Nodemailer)
    // Example:
    // await emailService.send({
    //   to: data.email,
    //   subject: data.title,
    //   html: data.message,
    // });

    // For now, log to console
    console.log(
      `[Email Notification] To: ${data.email}, Subject: ${data.title}, Message: ${data.message}`
    );

    // Update status to SENT (in production, update after actual email is sent)
    await updateNotificationStatus(notification.id, NotificationStatus.SENT);
  } catch (error: any) {
    console.error(`[Email Notification] Failed to send email:`, error);
    await updateNotificationStatus(
      notification.id,
      NotificationStatus.FAILED,
      error.message || 'Failed to send email'
    );
    throw error;
  }
}

/**
 * Create in-app notification record
 */
export async function createInAppNotification(data: NotificationData): Promise<any> {
  if (!data.userId) {
    throw new Error('User ID is required for in-app notification');
  }

  // Create notification record with PENDING status (will be marked as SENT immediately)
  const notification = await createNotificationRecord(data, NotificationStatus.PENDING);

  // For in-app notifications, mark as SENT immediately since they're stored in DB
  await updateNotificationStatus(notification.id, NotificationStatus.SENT);

  return notification;
}

/**
 * Send notification via specified channel(s)
 */
export async function sendNotification(data: NotificationData): Promise<any> {
  switch (data.channel) {
    case 'SMS':
      await sendSMS(data);
      break;
    case 'EMAIL':
      await sendEmail(data);
      break;
    case 'IN_APP':
      return await createInAppNotification(data);
    case 'PUSH':
      // TODO: Implement push notification
      console.warn('Push notifications not yet implemented');
      break;
    default:
      console.warn(`Unknown notification channel: ${data.channel}`);
  }
}

/**
 * Get notifications for a user or cooperative
 */
export async function getNotifications(options: NotificationQueryOptions): Promise<{
  notifications: any[];
  total: number;
}> {
  const where: any = {
    cooperativeId: options.cooperativeId,
  };

  if (options.userId) {
    where.userId = options.userId;
  }

  if (options.type) {
    where.type = options.type;
  }

  if (options.channel) {
    where.channel = options.channel;
  }

  // Handle status and unreadOnly - combine with AND logic if both are provided
  if (options.status && options.unreadOnly) {
    // Validate: if status is READ, unreadOnly would create a contradiction
    if (options.status === NotificationStatus.READ) {
      // If status is READ and unreadOnly is true, this is a logical contradiction
      // Return empty result by creating an impossible condition
      where.id = 'impossible-id-that-does-not-exist';
    } else {
      // If both are provided and status is not READ, combine them: status must match AND not be READ
      where.AND = [{ status: options.status }, { status: { not: NotificationStatus.READ } }];
    }
  } else if (options.status) {
    where.status = options.status;
  } else if (options.unreadOnly) {
    where.status = { not: NotificationStatus.READ };
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: options.limit || 50,
      skip: options.offset || 0,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(cooperativeId: string, userId: string): Promise<number> {
  return await prisma.notification.count({
    where: {
      cooperativeId,
      userId,
      status: { not: NotificationStatus.READ },
      channel: NotificationChannel.IN_APP,
    },
  });
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  // Verify notification belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  if (notification.userId !== userId) {
    throw new Error('Notification does not belong to user');
  }

  if (notification.status === NotificationStatus.READ) {
    return; // Already read
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(cooperativeId: string, userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      cooperativeId,
      userId,
      status: { not: NotificationStatus.READ },
      channel: NotificationChannel.IN_APP,
    },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  // Verify notification belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  if (notification.userId !== userId) {
    throw new Error('Notification does not belong to user');
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });
}

/**
 * Send meeting notification to all attendees
 */
export async function sendMeetingNotifications(
  cooperativeId: string,
  meetingTitle: string,
  meetingDate: Date,
  meetingTime: string | null,
  location: string | null,
  attendees: Array<{ phone?: string | null; email?: string | null; userId?: string }>
): Promise<number> {
  const dateStr = meetingDate.toLocaleDateString();
  const timeStr = meetingTime || 'TBD';
  const locationStr = location || 'TBD';

  const message = `Namaste. ${meetingTitle} scheduled for ${dateStr} at ${timeStr}. Location: ${locationStr}`;

  let sentCount = 0;

  for (const attendee of attendees) {
    // Send SMS if phone is available
    if (attendee.phone) {
      try {
        await sendNotification({
          cooperativeId,
          userId: attendee.userId,
          type: 'meeting_scheduled',
          title: 'Meeting Scheduled',
          message,
          channel: 'SMS',
          phone: attendee.phone,
          metadata: {
            meetingTitle,
            meetingDate: meetingDate.toISOString(),
            meetingTime,
            location,
          },
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send SMS to ${attendee.phone}:`, error);
      }
    }

    // Send in-app notification if userId is available
    if (attendee.userId) {
      try {
        await sendNotification({
          cooperativeId,
          userId: attendee.userId,
          type: 'meeting_scheduled',
          title: 'Meeting Scheduled',
          message,
          channel: 'IN_APP',
          metadata: {
            meetingTitle,
            meetingDate: meetingDate.toISOString(),
            meetingTime,
            location,
          },
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send in-app notification to user ${attendee.userId}:`, error);
      }
    }
  }

  return sentCount;
}
