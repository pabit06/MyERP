/**
 * Notification service for sending SMS, Email, and In-App notifications
 * Supports database storage for all notification types
 */

import { prisma } from './prisma.js';
import { NotificationChannel, NotificationStatus, Prisma } from '@prisma/client';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { env, logger } from '../config/index.js';

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
  const updateData: Prisma.NotificationUpdateInput = {
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
 * Get SMS provider client (Twilio or local)
 */
function getSMSClient() {
  const provider = env.SMS_PROVIDER || 'console';
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const fromNumber = env.TWILIO_PHONE_NUMBER;

  if (provider === 'twilio' && accountSid && authToken && fromNumber) {
    return {
      type: 'twilio' as const,
      client: twilio(accountSid, authToken),
      fromNumber,
    };
  }

  return {
    type: 'console' as const,
    client: null,
    fromNumber: null,
  };
}

/**
 * Send SMS notification
 * Supports Twilio and console logging (for development)
 */
export async function sendSMS(data: NotificationData): Promise<any> {
  if (!data.phone) {
    throw new Error('Phone number is required for SMS notification');
  }

  // Create notification record
  const notification = await createNotificationRecord(data, NotificationStatus.PENDING);

  try {
    const smsClient = getSMSClient();

    if (smsClient.type === 'twilio' && smsClient.client && smsClient.fromNumber) {
      // Send via Twilio
      const message = await smsClient.client.messages.create({
        body: data.message,
        from: smsClient.fromNumber,
        to: data.phone,
      });

      console.log(`[SMS Notification] Sent via Twilio. SID: ${message.sid}`);
      await updateNotificationStatus(notification.id, NotificationStatus.SENT);

      // Fetch updated notification to return current status
      return await prisma.notification.findUnique({
        where: { id: notification.id },
      });
    } else {
      // Console logging for development/local testing
      // Keep as PENDING since notification was not actually sent to external service
      console.log(`[SMS Notification] To: ${data.phone}, Message: ${data.message}`);
      console.log(
        `[SMS Notification] Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to send real SMS`
      );
      // Do not mark as SENT - keep as PENDING so it can be retried when service is configured
      // Return current notification (still PENDING)
      return notification;
    }
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
 * Get email transporter (SMTP via Nodemailer)
 */
function getEmailTransporter() {
  const smtpHost = env.SMTP_HOST;
  const smtpPort = env.SMTP_PORT || 587;
  const smtpUser = env.SMTP_USER;
  const smtpPass = env.SMTP_PASS;
  const smtpSecure = env.SMTP_SECURE || false;

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  return null;
}

/**
 * Send Email notification
 * Supports SMTP via Nodemailer (works with Gmail, SendGrid, AWS SES, etc.)
 */
export async function sendEmail(data: NotificationData): Promise<any> {
  if (!data.email) {
    throw new Error('Email address is required for email notification');
  }

  // Create notification record
  const notification = await createNotificationRecord(data, NotificationStatus.PENDING);

  try {
    const transporter = getEmailTransporter();
    const smtpFrom = env.SMTP_FROM || env.SMTP_USER || 'noreply@myerp.com';

    if (transporter) {
      // Send via SMTP
      const info = await transporter.sendMail({
        from: smtpFrom,
        to: data.email,
        subject: data.title,
        html: data.message,
        text: data.message.replace(/<[^>]*>/g, ''), // Strip HTML for plain text version
      });

      console.log(`[Email Notification] Sent via SMTP. Message ID: ${info.messageId}`);
      await updateNotificationStatus(notification.id, NotificationStatus.SENT);

      // Fetch updated notification to return current status
      return await prisma.notification.findUnique({
        where: { id: notification.id },
      });
    } else {
      // Console logging for development/local testing
      // Keep as PENDING since notification was not actually sent to external service
      console.log(
        `[Email Notification] To: ${data.email}, Subject: ${data.title}, Message: ${data.message}`
      );
      console.log(
        `[Email Notification] Configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to send real emails`
      );
      // Do not mark as SENT - keep as PENDING so it can be retried when service is configured
      // Return current notification (still PENDING)
      return notification;
    }
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

  // Fetch updated notification to return current status
  return await prisma.notification.findUnique({
    where: { id: notification.id },
  });
}

/**
 * Get FCM admin instance (if configured)
 */
async function getFCMAdmin() {
  const fcmProjectId = env.FCM_PROJECT_ID;
  const fcmPrivateKey = env.FCM_PRIVATE_KEY;
  const fcmClientEmail = env.FCM_CLIENT_EMAIL;
  const fcmPrivateKeyPath = env.FCM_PRIVATE_KEY_PATH;

  if (!fcmProjectId) {
    return null;
  }

  try {
    // Dynamic import to avoid requiring firebase-admin if not configured
    const admin = (await import('firebase-admin').catch(() => null)) as any;
    if (!admin) {
      logger.warn('firebase-admin not available, push notifications disabled');
      return;
    }

    if (!admin.apps.length) {
      // Initialize Firebase Admin if not already initialized
      const credential = fcmPrivateKeyPath
        ? admin.credential.cert(fcmPrivateKeyPath)
        : fcmPrivateKey && fcmClientEmail
          ? admin.credential.cert({
            projectId: fcmProjectId,
            privateKey: fcmPrivateKey.replace(/\\n/g, '\n'),
            clientEmail: fcmClientEmail,
          })
          : null;

      if (credential) {
        admin.initializeApp({
          credential,
          projectId: fcmProjectId,
        });
      } else {
        console.warn('[Push Notification] FCM credentials incomplete');
        return null;
      }
    }

    return admin;
  } catch (error) {
    console.warn('[Push Notification] Firebase Admin not installed. Run: pnpm add firebase-admin');
    return null;
  }
}

/**
 * Send Push notification
 * Supports FCM (Firebase Cloud Messaging) and basic storage
 * Can be extended with APNs for iOS
 */
async function sendPushNotification(data: NotificationData): Promise<any> {
  if (!data.userId) {
    throw new Error('User ID is required for push notification');
  }

  // Create notification record
  const notification = await createNotificationRecord(data, NotificationStatus.PENDING);

  try {
    // Try to get user's device tokens from database
    // Note: You'll need to add a UserDeviceToken table to store FCM tokens
    // For now, we'll check if FCM is configured and log accordingly

    const fcmAdmin = await getFCMAdmin();

    if (fcmAdmin) {
      // FCM is configured - attempt to send push notification
      // Note: You need to store device tokens in your database
      // Example query:
      // const deviceTokens = await prisma.userDeviceToken.findMany({
      //   where: { userId: data.userId, isActive: true },
      //   select: { token: true, platform: true },
      // });

      // For now, log that FCM is configured
      console.log(`[Push Notification] FCM configured. User: ${data.userId}, Title: ${data.title}`);
      console.log(
        `[Push Notification] To send actual push, store device tokens in UserDeviceToken table`
      );

      // Example FCM send code (uncomment when device tokens are available):
      // if (deviceTokens.length > 0) {
      //   const tokens = deviceTokens.map((dt) => dt.token);
      //   const message = {
      //     notification: {
      //       title: data.title,
      //       body: data.message,
      //     },
      //     data: {
      //       type: data.type,
      //       notificationId: notification.id,
      //       ...data.metadata,
      //     },
      //     tokens,
      //   };
      //   const response = await fcmAdmin.messaging().sendEachForMulticast(message);
      //   console.log(`[Push Notification] Sent to ${response.successCount} devices`);
      // }
    } else {
      // FCM not configured - log to console
      // Keep as PENDING since notification was not actually sent to external service
      console.log(
        `[Push Notification] User: ${data.userId}, Title: ${data.title}, Message: ${data.message}`
      );
      console.log(
        `[Push Notification] Configure FCM_PROJECT_ID, FCM_PRIVATE_KEY, and FCM_CLIENT_EMAIL to enable FCM`
      );
      // Do not mark as SENT - keep as PENDING so it can be retried when service is configured
      return notification;
    }

    // Mark as sent only after actual push is sent (when FCM is configured and device tokens are available)
    // For now, if FCM is configured but no device tokens are available, keep as PENDING
    // NOTE: Device token management needs to be implemented:
    // - Store device tokens in database (e.g., UserDeviceToken model)
    // - Register tokens when users log in from mobile apps
    // - Uncomment the following when device tokens are implemented:
    // if (deviceTokens.length > 0 && response.successCount > 0) {
    //   await updateNotificationStatus(notification.id, NotificationStatus.SENT);
    // }

    // For now, keep as PENDING since we're not actually sending
    return notification;
  } catch (error: any) {
    console.error(`[Push Notification] Failed to send push:`, error);
    await updateNotificationStatus(
      notification.id,
      NotificationStatus.FAILED,
      error.message || 'Failed to send push notification'
    );
    throw error;
  }
}

/**
 * Send notification via specified channel(s)
 * Returns the notification object for all channels
 */
export async function sendNotification(data: NotificationData): Promise<any> {
  switch (data.channel) {
    case 'SMS':
      return await sendSMS(data);
    case 'EMAIL':
      return await sendEmail(data);
    case 'IN_APP':
      return await createInAppNotification(data);
    case 'PUSH':
      return await sendPushNotification(data);
    default:
      console.warn(`Unknown notification channel: ${data.channel}`);
      throw new Error(`Unknown notification channel: ${data.channel}`);
  }
}

/**
 * Get notifications for a user or cooperative
 */
export async function getNotifications(options: NotificationQueryOptions): Promise<{
  notifications: any[];
  total: number;
}> {
  const where: Prisma.NotificationWhereInput = {
    cooperativeId: options.cooperativeId,
  };

  // Check for logical contradiction first (status=READ and unreadOnly=true)
  if (options.status === NotificationStatus.READ && options.unreadOnly) {
    // Return empty result by creating an impossible condition
    where.id = 'impossible-id-that-does-not-exist';
  } else {
    // Build base filters that apply to all notifications
    const baseFilters: Prisma.NotificationWhereInput = {};

    if (options.type) {
      baseFilters.type = options.type;
    }

    if (options.channel) {
      baseFilters.channel = options.channel;
    }

    // Handle status and unreadOnly - combine with AND logic if both are provided
    if (options.status && options.unreadOnly) {
      // If both are provided and status is not READ, combine them: status must match AND not be READ
      baseFilters.AND = [{ status: options.status }, { status: { not: NotificationStatus.READ } }];
    } else if (options.status) {
      baseFilters.status = options.status;
    } else if (options.unreadOnly) {
      baseFilters.status = { not: NotificationStatus.READ };
    }

    // Include both user-specific notifications and broadcast notifications (userId is null)
    // Apply base filters to each branch of the OR condition to ensure proper scoping
    if (options.userId) {
      where.OR = [
        { userId: options.userId, ...baseFilters },
        { userId: null, ...baseFilters }, // Broadcast notifications
      ];
    } else {
      // If no userId filter, apply base filters directly
      Object.assign(where, baseFilters);
    }
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
      OR: [
        { userId }, // User-specific notifications
        { userId: null }, // Broadcast notifications
      ],
      status: { not: NotificationStatus.READ },
      channel: NotificationChannel.IN_APP,
    },
  });
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string,
  cooperativeId: string
): Promise<void> {
  // Verify notification belongs to user or is a broadcast notification
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  // Verify notification belongs to the same cooperative
  if (notification.cooperativeId !== cooperativeId) {
    throw new Error('Notification does not belong to user');
  }

  // Allow access if:
  // 1. Notification is a broadcast (userId is null) - accessible to all users in cooperative
  // 2. Notification belongs to the user (userId matches)
  if (notification.userId !== null && notification.userId !== userId) {
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
      OR: [
        { userId }, // User-specific notifications
        { userId: null }, // Broadcast notifications
      ],
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
export async function deleteNotification(
  notificationId: string,
  userId: string,
  cooperativeId: string
): Promise<void> {
  // Verify notification belongs to user or is a broadcast notification
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  // Verify notification belongs to the same cooperative
  if (notification.cooperativeId !== cooperativeId) {
    throw new Error('Notification does not belong to user');
  }

  // Allow access if:
  // 1. Notification is a broadcast (userId is null) - accessible to all users in cooperative
  // 2. Notification belongs to the user (userId matches)
  if (notification.userId !== null && notification.userId !== userId) {
    throw new Error('Notification does not belong to user');
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });
}

/**
 * Send bulk notification to multiple recipients
 * Returns summary of successful and failed sends
 */
export async function sendBulkNotification(
  cooperativeId: string,
  channel: 'SMS' | 'EMAIL' | 'IN_APP' | 'PUSH',
  recipients: Array<{ userId?: string; phone?: string; email?: string; name?: string }>,
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<{ success: number; failed: number; errors: any[] }> {
  let successCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  // Process in chunks to avoid overwhelming providers
  const CHUNK_SIZE = 50;
  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (recipient) => {
        try {
          // Skip if missing required contact info for channel
          if (channel === 'SMS' && !recipient.phone) return;
          if (channel === 'EMAIL' && !recipient.email) return;
          if ((channel === 'IN_APP' || channel === 'PUSH') && !recipient.userId) return;

          await sendNotification({
            cooperativeId,
            userId: recipient.userId,
            phone: recipient.phone,
            email: recipient.email,
            type: 'bulk_announcement',
            title,
            message, // TODO: Template substitution if needed (e.g. Hello {name})
            channel,
            metadata,
          });
          successCount++;
        } catch (error: any) {
          failedCount++;
          errors.push({
            recipient: recipient.userId || recipient.phone || recipient.email,
            error: error.message,
          });
        }
      })
    );
  }

  return { success: successCount, failed: failedCount, errors };
}

/**
 * Send meeting notification to all attendees
 * Returns the number of unique attendees notified (not total notifications sent)
 *
 * Handles cases where:
 * - Same person appears with different identifiers (userId vs phone/email)
 * - Same userId appears multiple times with different contact methods
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

  // Build maps for cross-referencing identifiers
  // Maps phone/email to userId to identify same person with different identifiers
  const phoneToUserId = new Map<string, string>();
  const emailToUserId = new Map<string, string>();

  // Collect all contact methods for each userId (not just the last one)
  // This ensures we send notifications to all contact methods even if userId appears multiple times
  const userIdToContactMethods = new Map<
    string,
    { phones: Set<string>; emails: Set<string>; hasUserId: boolean }
  >();

  // First pass: collect all userIds and their associated contact info
  for (const attendee of attendees) {
    if (attendee.userId) {
      // Initialize or get existing contact methods for this userId
      if (!userIdToContactMethods.has(attendee.userId)) {
        userIdToContactMethods.set(attendee.userId, {
          phones: new Set<string>(),
          emails: new Set<string>(),
          hasUserId: true,
        });
      }
      const contactMethods = userIdToContactMethods.get(attendee.userId)!;

      // Add all contact methods (accumulate, don't overwrite)
      if (attendee.phone) {
        contactMethods.phones.add(attendee.phone);
        phoneToUserId.set(attendee.phone, attendee.userId);
      }
      if (attendee.email) {
        contactMethods.emails.add(attendee.email);
        emailToUserId.set(attendee.email, attendee.userId);
      }
    }
  }

  // Track unique attendees notified using userId as primary key
  const notifiedAttendees = new Set<string>();

  // Track which contact methods have already been notified to prevent duplicates
  // when different userIds share the same phone/email
  const notifiedPhones = new Set<string>();
  const notifiedEmails = new Set<string>();

  // Second pass: process all attendees and send notifications
  for (const attendee of attendees) {
    // Determine the unique identifier for this attendee
    // Priority: userId > userId found via phone/email lookup > phone > email
    let uniqueAttendeeId: string | null = null;

    if (attendee.userId) {
      // Direct userId match - most reliable
      uniqueAttendeeId = attendee.userId;
    } else if (attendee.phone && phoneToUserId.has(attendee.phone)) {
      // Phone matches a known userId - use that userId
      uniqueAttendeeId = phoneToUserId.get(attendee.phone)!;
    } else if (attendee.email && emailToUserId.has(attendee.email)) {
      // Email matches a known userId - use that userId
      uniqueAttendeeId = emailToUserId.get(attendee.email)!;
    } else if (attendee.phone) {
      // No userId found, use phone as fallback (prefixed to avoid collisions)
      uniqueAttendeeId = `phone:${attendee.phone}`;
    } else if (attendee.email) {
      // No userId found, use email as fallback (prefixed to avoid collisions)
      uniqueAttendeeId = `email:${attendee.email}`;
    }

    if (!uniqueAttendeeId) {
      // Skip if no identifier available
      continue;
    }

    // Skip if we've already processed this unique attendee
    // (we'll send all their notifications in one go below)
    if (notifiedAttendees.has(uniqueAttendeeId)) {
      continue;
    }

    // Get all contact methods for this unique attendee
    let phonesToNotify: string[] = [];
    let emailsToNotify: string[] = [];
    let userIdForNotifications: string | undefined = undefined;

    if (uniqueAttendeeId.startsWith('phone:')) {
      // Fallback case: no userId, just phone
      const phone = uniqueAttendeeId.replace('phone:', '');
      phonesToNotify = [phone];
    } else if (uniqueAttendeeId.startsWith('email:')) {
      // Fallback case: no userId, just email
      const email = uniqueAttendeeId.replace('email:', '');
      emailsToNotify = [email];
    } else {
      // userId-based: use all collected contact methods
      userIdForNotifications = uniqueAttendeeId;
      const contactMethods = userIdToContactMethods.get(uniqueAttendeeId);
      if (contactMethods) {
        phonesToNotify = Array.from(contactMethods.phones);
        emailsToNotify = Array.from(contactMethods.emails);
      } else {
        // Fallback: use current attendee's contact info
        if (attendee.phone) phonesToNotify = [attendee.phone];
        if (attendee.email) emailsToNotify = [attendee.email];
      }
    }

    // Filter out contact methods that have already been notified
    // This prevents duplicate notifications when different userIds share the same phone/email
    phonesToNotify = phonesToNotify.filter((phone) => !notifiedPhones.has(phone));
    emailsToNotify = emailsToNotify.filter((email) => !notifiedEmails.has(email));

    let attendeeNotified = false;

    // Send SMS to all phone numbers for this attendee (that haven't been notified yet)
    for (const phone of phonesToNotify) {
      try {
        await sendNotification({
          cooperativeId,
          userId: userIdForNotifications,
          type: 'meeting_scheduled',
          title: 'Meeting Scheduled',
          message,
          channel: 'SMS',
          phone,
          metadata: {
            meetingTitle,
            meetingDate: meetingDate.toISOString(),
            meetingTime,
            location,
          },
        });
        notifiedPhones.add(phone); // Mark this phone as notified
        attendeeNotified = true;
      } catch (error) {
        console.error(`Failed to send SMS to ${phone}:`, error);
      }
    }

    // Send email to all email addresses for this attendee (that haven't been notified yet)
    for (const email of emailsToNotify) {
      try {
        await sendNotification({
          cooperativeId,
          userId: userIdForNotifications,
          type: 'meeting_scheduled',
          title: 'Meeting Scheduled',
          message,
          channel: 'EMAIL',
          email,
          metadata: {
            meetingTitle,
            meetingDate: meetingDate.toISOString(),
            meetingTime,
            location,
          },
        });
        notifiedEmails.add(email); // Mark this email as notified
        attendeeNotified = true;
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
      }
    }

    // Send in-app notification if userId is available (only once per userId)
    if (userIdForNotifications) {
      try {
        await sendNotification({
          cooperativeId,
          userId: userIdForNotifications,
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
        attendeeNotified = true;
      } catch (error) {
        console.error(
          `Failed to send in-app notification to user ${userIdForNotifications}:`,
          error
        );
      }
    }

    // Count attendee as notified if at least one notification was sent successfully
    if (attendeeNotified) {
      notifiedAttendees.add(uniqueAttendeeId);
    }
  }

  return notifiedAttendees.size;
}
