# Notification Service Setup Guide

यो guide मा Notification Service setup र testing को लागि step-by-step instructions छन्।

## 📋 Prerequisites

1. **SMS (Twilio):**
   - Twilio account (sign up at https://www.twilio.com)
   - Twilio Account SID
   - Twilio Auth Token
   - Twilio Phone Number

2. **Email (SMTP):**
   - SMTP server credentials (Gmail, SendGrid, AWS SES, etc.)
   - SMTP Host, Port, Username, Password

## 🔧 Step 1: Environment Variables Setup

### Create `.env` file

`apps/backend/` directory मा `.env` file बनाउनुहोस् (यदि छैन भने):

```bash
cd apps/backend
cp env.example .env
```

### Add SMS Configuration (Twilio)

`.env` file मा यी variables थप्नुहोस्:

```env
# SMS Configuration (Twilio)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid-here
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890
```

**Twilio Credentials कसरी पाउने:**

1. https://www.twilio.com मा login गर्नुहोस्
2. Dashboard मा Account SID र Auth Token हेर्नुहोस्
3. Phone Numbers section मा verified phone number लिनुहोस्

### Add Email Configuration (SMTP)

`.env` file मा यी variables थप्नुहोस्:

#### Gmail Example:

```env
# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@myerp.com
SMTP_SECURE=false
```

**Gmail App Password कसरी बनाउने:**

1. Google Account Settings मा जानुहोस्
2. Security → 2-Step Verification enable गर्नुहोस्
3. App Passwords section मा "Mail" र "Other" select गरेर password generate गर्नुहोस्
4. त्यो password use गर्नुहोस् (regular password होइन)

#### SendGrid Example:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@myerp.com
SMTP_SECURE=false
```

#### AWS SES Example:

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=noreply@myerp.com
SMTP_SECURE=false
```

### Add Test Configuration (Optional)

Testing को लागि:

```env
# Test Configuration
TEST_PHONE_NUMBER=+1234567890
TEST_EMAIL=test@example.com
TEST_COOPERATIVE_ID=your-cooperative-id
TEST_USER_ID=your-user-id
```

## 🧪 Step 2: Test Notifications

### Install Dependencies (if not already installed)

```bash
cd apps/backend
pnpm install
```

### Run Tests

**All notifications test:**

```bash
pnpm test:notifications --all
```

**SMS only:**

```bash
pnpm test:notifications --sms
```

**Email only:**

```bash
pnpm test:notifications --email
```

**Push notification only:**

```bash
pnpm test:notifications --push
```

### Expected Output

**If configured correctly:**

```
🧪 MyERP Notification Service Test Suite
==================================================

📱 Testing SMS Notification...
Sending SMS to: +1234567890
[SMS Notification] Sent via Twilio. SID: SMxxxxx
✅ SMS test completed successfully!

📧 Testing Email Notification...
Sending email to: test@example.com
[Email Notification] Sent via SMTP. Message ID: <xxxxx>
✅ Email test completed successfully!
```

**If not configured (console mode):**

```
📱 Testing SMS Notification...
Sending SMS to: +1234567890
[SMS Notification] To: +1234567890, Message: ...
[SMS Notification] Configure TWILIO_ACCOUNT_SID... to send real SMS
✅ SMS test completed successfully!
```

## 🔔 Step 3: Push Notifications (Optional - FCM/APNs)

### Firebase Cloud Messaging (FCM) Setup

1. **Install FCM package:**

```bash
cd apps/backend
pnpm add firebase-admin
```

2. **Get FCM credentials:**
   - Firebase Console मा जानुहोस्
   - Project Settings → Service Accounts
   - Generate new private key
   - Download JSON file

3. **Add to `.env`:**

```env
# Push Notifications (FCM)
FCM_PROJECT_ID=your-project-id
FCM_PRIVATE_KEY_PATH=./path/to/service-account-key.json
# OR
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

4. **Update `notifications.ts`:**
   - FCM integration code add गर्नुहोस् (see implementation below)

### Apple Push Notification Service (APNs) Setup

1. **Install APNs package:**

```bash
cd apps/backend
pnpm add apn
```

2. **Get APNs credentials:**
   - Apple Developer Account मा जानुहोस्
   - Certificates, Identifiers & Profiles
   - APNs Auth Key create गर्नुहोस्
   - Download .p8 file

3. **Add to `.env`:**

```env
# Push Notifications (APNs)
APNS_KEY_ID=your-key-id
APNS_TEAM_ID=your-team-id
APNS_BUNDLE_ID=com.yourcompany.myerp
APNS_KEY_PATH=./path/to/AuthKey_XXXXX.p8
APNS_PRODUCTION=false  # true for production, false for sandbox
```

## 📝 Usage in Code

### Send SMS

```typescript
import { sendSMS } from './lib/notifications.js';

await sendSMS({
  cooperativeId: 'coop-id',
  type: 'meeting_scheduled',
  title: 'Meeting Scheduled',
  message: 'Your meeting is scheduled for tomorrow at 10 AM',
  channel: 'SMS',
  phone: '+1234567890',
});
```

### Send Email

```typescript
import { sendEmail } from './lib/notifications.js';

await sendEmail({
  cooperativeId: 'coop-id',
  type: 'loan_approved',
  title: 'Loan Approved',
  message: '<h1>Congratulations!</h1><p>Your loan has been approved.</p>',
  channel: 'EMAIL',
  email: 'user@example.com',
});
```

### Send Push Notification

```typescript
import { sendNotification } from './lib/notifications.js';

await sendNotification({
  cooperativeId: 'coop-id',
  userId: 'user-id',
  type: 'payment_received',
  title: 'Payment Received',
  message: 'Your payment of Rs. 10,000 has been received',
  channel: 'PUSH',
});
```

## 🐛 Troubleshooting

### SMS Not Working

1. **Check Twilio credentials:**
   - Account SID र Auth Token correct छन्?
   - Phone number verified छ?

2. **Check environment variables:**

   ```bash
   echo $TWILIO_ACCOUNT_SID
   echo $TWILIO_AUTH_TOKEN
   ```

3. **Check Twilio console:**
   - Twilio Dashboard मा logs हेर्नुहोस्
   - Error messages check गर्नुहोस्

### Email Not Working

1. **Check SMTP credentials:**
   - Host, Port, User, Pass correct छन्?
   - Gmail को case मा App Password use गर्नुभयो?

2. **Check firewall/network:**
   - SMTP port (587/465) blocked छैन?
   - VPN use गर्दै हुनुहुन्छ?

3. **Test SMTP connection:**

   ```bash
   telnet smtp.gmail.com 587
   ```

4. **Check email service logs:**
   - Gmail: Check "Less secure app access" (deprecated, use App Password)
   - SendGrid: Check Activity Feed
   - AWS SES: Check CloudWatch logs

### Push Notifications Not Working

1. **Check FCM/APNs setup:**
   - Credentials correct छन्?
   - Device tokens valid छन्?

2. **Check database:**
   - Notifications table मा records create भएका छन्?

## 📚 Additional Resources

- [Twilio Documentation](https://www.twilio.com/docs)
- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notifications](https://developer.apple.com/documentation/usernotifications)

## ✅ Checklist

- [ ] `.env` file create गरियो
- [ ] Twilio credentials add गरियो
- [ ] SMTP credentials add गरियो
- [ ] Test script run गरियो
- [ ] SMS test successful
- [ ] Email test successful
- [ ] (Optional) FCM/APNs setup गरियो

## 🎉 Success!

यदि सबै tests pass भए, तपाईंको notification service ready छ!

Production मा deploy गर्नु अघि:

- Environment variables secure रूपमा store गर्नुहोस्
- Error monitoring setup गर्नुहोस्
- Rate limiting consider गर्नुहोस्
- Notification queue system consider गर्नुहोस् (high volume को लागि)
