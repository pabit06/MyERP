/**
 * Notification service for sending SMS, Email, and In-App notifications
 * Currently implements placeholder SMS logging
 */

export interface NotificationData {
  cooperativeId: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  channel: 'SMS' | 'EMAIL' | 'IN_APP';
  phone?: string;
  email?: string;
}

/**
 * Send SMS notification (placeholder - logs to console)
 * TODO: Integrate with actual SMS gateway
 */
export async function sendSMS(data: NotificationData): Promise<void> {
  if (data.phone) {
    console.log(`[SMS Notification] To: ${data.phone}, Message: ${data.message}`);
    // TODO: Integrate with SMS gateway (e.g., Twilio, Nexmo, local SMS provider)
    // Example:
    // await smsGateway.send({
    //   to: data.phone,
    //   message: data.message,
    // });
  }
}

/**
 * Send Email notification (placeholder)
 * TODO: Integrate with email service
 */
export async function sendEmail(data: NotificationData): Promise<void> {
  if (data.email) {
    console.log(
      `[Email Notification] To: ${data.email}, Subject: ${data.title}, Message: ${data.message}`
    );
    // TODO: Integrate with email service (e.g., SendGrid, AWS SES, Nodemailer)
  }
}

/**
 * Create in-app notification record
 * TODO: Implement Notification model and database storage
 */
export async function createInAppNotification(data: NotificationData): Promise<void> {
  console.log(
    `[In-App Notification] User: ${data.userId}, Type: ${data.type}, Title: ${data.title}`
  );
  // TODO: Store notification in database
  // Example:
  // await prisma.notification.create({
  //   data: {
  //     cooperativeId: data.cooperativeId,
  //     userId: data.userId,
  //     type: data.type,
  //     title: data.title,
  //     message: data.message,
  //     channel: 'IN_APP',
  //     sentAt: new Date(),
  //   },
  // });
}

/**
 * Send notification via specified channel(s)
 */
export async function sendNotification(data: NotificationData): Promise<void> {
  switch (data.channel) {
    case 'SMS':
      await sendSMS(data);
      break;
    case 'EMAIL':
      await sendEmail(data);
      break;
    case 'IN_APP':
      await createInAppNotification(data);
      break;
    default:
      console.warn(`Unknown notification channel: ${data.channel}`);
  }
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
    if (attendee.phone) {
      await sendNotification({
        cooperativeId,
        userId: attendee.userId,
        type: 'meeting_scheduled',
        title: 'Meeting Scheduled',
        message,
        channel: 'SMS',
        phone: attendee.phone,
      });
      sentCount++;
    }
  }

  return sentCount;
}
