/**
 * Test script for Notification Service
 * Tests SMS, Email, and Push notifications
 *
 * Usage:
 *   pnpm --filter @myerp/backend test:notifications
 *
 * Make sure to set environment variables in .env file:
 *   - For SMS: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *   - For Email: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */

import { sendSMS, sendEmail, sendNotification } from '../src/lib/notifications.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function testSMS() {
  console.log('\n📱 Testing SMS Notification...\n');

  try {
    // You need to provide a test phone number
    const testPhone = process.env.TEST_PHONE_NUMBER || '+1234567890';
    const cooperativeId = process.env.TEST_COOPERATIVE_ID || 'test-coop-id';

    console.log(`Sending SMS to: ${testPhone}`);
    console.log('Note: If Twilio is not configured, it will log to console\n');

    await sendSMS({
      cooperativeId,
      type: 'test_sms',
      title: 'Test SMS',
      message: 'This is a test SMS from MyERP notification service.',
      channel: 'SMS',
      phone: testPhone,
    });

    console.log('✅ SMS test completed successfully!\n');
  } catch (error: any) {
    console.error('❌ SMS test failed:', error.message);
    console.error(
      'Make sure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set in .env\n'
    );
  }
}

async function testEmail() {
  console.log('\n📧 Testing Email Notification...\n');

  try {
    // You need to provide a test email address
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const cooperativeId = process.env.TEST_COOPERATIVE_ID || 'test-coop-id';

    console.log(`Sending email to: ${testEmail}`);
    console.log('Note: If SMTP is not configured, it will log to console\n');

    await sendEmail({
      cooperativeId,
      type: 'test_email',
      title: 'Test Email from MyERP',
      message: `
        <h2>Test Email</h2>
        <p>This is a test email from MyERP notification service.</p>
        <p>If you receive this email, your SMTP configuration is working correctly!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated test message.</p>
      `,
      channel: 'EMAIL',
      email: testEmail,
    });

    console.log('✅ Email test completed successfully!\n');
  } catch (error: any) {
    console.error('❌ Email test failed:', error.message);
    console.error('Make sure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS are set in .env\n');
  }
}

async function testPushNotification() {
  console.log('\n🔔 Testing Push Notification...\n');

  try {
    const cooperativeId = process.env.TEST_COOPERATIVE_ID || 'test-coop-id';
    const testUserId = process.env.TEST_USER_ID || 'test-user-id';

    console.log(`Sending push notification to user: ${testUserId}`);
    console.log('Note: Push notifications are stored in database (FCM/APNs integration pending)\n');

    const notification = await sendNotification({
      cooperativeId,
      userId: testUserId,
      type: 'test_push',
      title: 'Test Push Notification',
      message: 'This is a test push notification from MyERP.',
      channel: 'PUSH',
    });

    console.log('✅ Push notification test completed successfully!');
    console.log(`Notification ID: ${notification.id}\n`);
  } catch (error: any) {
    console.error('❌ Push notification test failed:', error.message);
  }
}

async function main() {
  console.log('🧪 MyERP Notification Service Test Suite\n');
  console.log('='.repeat(50));

  // Check which tests to run
  const args = process.argv.slice(2);
  const testAll = args.length === 0 || args.includes('--all');
  const testSMSFlag = args.includes('--sms') || testAll;
  const testEmailFlag = args.includes('--email') || testAll;
  const testPushFlag = args.includes('--push') || testAll;

  if (testSMSFlag) {
    await testSMS();
  }

  if (testEmailFlag) {
    await testEmail();
  }

  if (testPushFlag) {
    await testPushNotification();
  }

  console.log('='.repeat(50));
  console.log('\n✨ Test suite completed!\n');
  console.log('Usage:');
  console.log('  pnpm --filter @myerp/backend test:notifications --all');
  console.log('  pnpm --filter @myerp/backend test:notifications --sms');
  console.log('  pnpm --filter @myerp/backend test:notifications --email');
  console.log('  pnpm --filter @myerp/backend test:notifications --push\n');
}

main().catch(console.error);
