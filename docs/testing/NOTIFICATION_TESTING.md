# Notification Service Testing Guide

## Quick Start

### 1. Setup Environment Variables

Create `.env` file in `apps/backend/` directory:

```bash
cd apps/backend
cp env.example .env
```

Then edit `.env` and add your credentials.

### 2. Test SMS (Twilio)

**Required variables:**

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TEST_PHONE_NUMBER=+1234567890  # Where to send test SMS
```

**Run test:**

```bash
pnpm test:notifications --sms
```

### 3. Test Email (SMTP)

**Required variables (Gmail example):**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@myerp.com
SMTP_SECURE=false
TEST_EMAIL=test@example.com  # Where to send test email
```

**Run test:**

```bash
pnpm test:notifications --email
```

### 4. Test Push Notifications

**Required variables (FCM - optional):**

```env
FCM_PROJECT_ID=your-project-id
FCM_PRIVATE_KEY_PATH=./path/to/service-account-key.json
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
TEST_USER_ID=your-user-id
```

**Run test:**

```bash
pnpm test:notifications --push
```

### 5. Test All

```bash
pnpm test:notifications --all
```

## Expected Results

### ✅ Success (Configured)

```
📱 Testing SMS Notification...
Sending SMS to: +1234567890
[SMS Notification] Sent via Twilio. SID: SMxxxxx
✅ SMS test completed successfully!
```

### ℹ️ Console Mode (Not Configured)

```
📱 Testing SMS Notification...
Sending SMS to: +1234567890
[SMS Notification] To: +1234567890, Message: ...
[SMS Notification] Configure TWILIO_ACCOUNT_SID... to send real SMS
✅ SMS test completed successfully!
```

## Troubleshooting

### SMS Issues

- Verify Twilio credentials in Twilio Console
- Check phone number format (+country code)
- Ensure Twilio account has credits

### Email Issues

- Gmail: Use App Password (not regular password)
- Check SMTP port (587 for TLS, 465 for SSL)
- Verify firewall allows SMTP connections
- Check spam folder

### Push Notification Issues

- FCM: Verify service account key is valid
- Ensure device tokens are stored in database
- Check Firebase project settings

## Next Steps

1. ✅ Test all notification types
2. ✅ Verify notifications in database
3. ✅ Check Twilio/SMTP logs
4. ✅ Integrate into your application flows

For detailed setup instructions, see `NOTIFICATION_SETUP.md`
