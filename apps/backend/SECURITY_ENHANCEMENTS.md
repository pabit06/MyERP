# Security Enhancements Implementation

## Overview

Comprehensive security enhancements have been implemented for the MyERP backend, including CSRF protection, input sanitization, audit logging, and enhanced security headers.

## Features Implemented

### 1. CSRF Protection ✅

**File Created:**

- `apps/backend/src/middleware/csrf.ts` - CSRF protection middleware

**Features:**

- Token-based CSRF protection for state-changing operations
- Automatic token generation and validation
- Session-based token storage
- Optional protection (can be disabled via environment variable)

**Usage:**

```typescript
import { csrfProtection, getCsrfToken } from './middleware/csrf.js';

// Apply to routes
router.post('/members', csrfProtection, createMember);

// Add endpoint to get CSRF token
router.get('/csrf-token', getCsrfToken);
```

**Client Usage:**

1. Get CSRF token: `GET /api/csrf-token`
2. Include in requests: `X-CSRF-Token: <token>`

**Configuration:**

- Set `ENABLE_CSRF_PROTECTION=false` to disable (default: enabled)

### 2. Input Sanitization ✅

**File Created:**

- `apps/backend/src/lib/sanitize.ts` - Input sanitization utilities

**Functions:**

- `sanitizeHtml()` - Sanitize HTML to prevent XSS
- `sanitizeText()` - Sanitize plain text
- `sanitizeFilename()` - Sanitize filenames
- `sanitizeEmail()` - Validate and sanitize emails
- `sanitizeUrl()` - Validate and sanitize URLs
- `sanitizeSqlPattern()` - Remove SQL injection patterns
- `sanitizeObject()` - Recursively sanitize objects

**Usage:**

```typescript
import { sanitizeHtml, sanitizeText, sanitizeObject } from '../lib/sanitize.js';

// Sanitize HTML content
const cleanHtml = sanitizeHtml(userInput);

// Sanitize plain text
const cleanText = sanitizeText(userInput);

// Sanitize entire object
const cleanData = sanitizeObject(userData, {
  sanitizeStrings: true,
  sanitizeHtml: false,
});
```

**Dependencies:**

- `isomorphic-dompurify` - For HTML sanitization (needs to be installed)

### 3. Audit Logging ✅

**File Created:**

- `apps/backend/src/lib/audit-log.ts` - Audit logging system

**Features:**

- Comprehensive audit logging for sensitive operations
- Automatic logging to database and Winston
- Sentry integration for critical actions
- Query interface for audit logs

**Audit Actions:**

- Authentication (login, logout, password changes)
- User management (create, update, delete)
- Permission changes
- Financial transactions
- Data operations (export, import, delete)
- System administration
- Compliance operations

**Usage:**

```typescript
import { createAuditLog, AuditAction } from '../lib/audit-log.js';

// Log an action
await createAuditLog({
  action: AuditAction.LOGIN_SUCCESS,
  userId: user.id,
  tenantId: user.cooperativeId,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  success: true,
});

// Query audit logs
const logs = await getAuditLogs({
  userId: 'user123',
  action: AuditAction.LOGIN_FAILURE,
  startDate: new Date('2024-01-01'),
  page: 1,
  limit: 50,
});
```

### 4. Enhanced Security Headers ✅

**File Modified:**

- `apps/backend/src/middleware/security.ts` - Enhanced Helmet configuration

**New Headers:**

- `X-Content-Type-Options: nosniff` - Prevent MIME type sniffing
- `X-Frame-Options: DENY` - Prevent clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer information
- `Strict-Transport-Security` - Force HTTPS (HSTS)

**Configuration:**
Already configured via Helmet middleware.

## Integration

### 1. Add CSRF Token Endpoint

Add to your routes:

```typescript
import { getCsrfToken } from '../middleware/csrf.js';

router.get('/csrf-token', getCsrfToken);
```

### 2. Apply CSRF Protection

Apply to state-changing routes:

```typescript
import { csrfProtection } from '../middleware/csrf.js';

router.post('/members', csrfProtection, validate(createMemberSchema), createMember);
router.put('/members/:id', csrfProtection, validate(updateMemberSchema), updateMember);
router.delete('/members/:id', csrfProtection, deleteMember);
```

### 3. Use Input Sanitization

Sanitize user inputs in routes:

```typescript
import { sanitizeHtml, sanitizeText } from '../lib/sanitize.js';

router.post('/content', async (req, res) => {
  const sanitizedContent = sanitizeHtml(req.body.content);
  // Use sanitizedContent
});
```

### 4. Add Audit Logging

Log sensitive operations:

```typescript
import { createAuditLog, AuditAction } from '../lib/audit-log.js';

// After successful operation
await createAuditLog({
  action: AuditAction.MEMBER_CREATED,
  userId: req.user.userId,
  tenantId: req.user.tenantId,
  resourceType: 'Member',
  resourceId: member.id,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  success: true,
});
```

## Dependencies

### Required

- `isomorphic-dompurify` - For HTML sanitization

Install:

```bash
pnpm add isomorphic-dompurify
```

## Environment Variables

```env
# CSRF Protection (optional, default: enabled)
ENABLE_CSRF_PROTECTION=true
```

## Security Best Practices

1. **Always sanitize user inputs** before storing or displaying
2. **Use CSRF protection** for all state-changing operations
3. **Log all sensitive operations** for audit trails
4. **Review audit logs regularly** for suspicious activity
5. **Keep security headers enabled** in production
6. **Use HTTPS** in production (required for HSTS)

## Testing

### Test CSRF Protection

```bash
# Get CSRF token
curl http://localhost:4000/api/csrf-token

# Use token in request
curl -X POST http://localhost:4000/api/members \
  -H "X-CSRF-Token: <token>" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"name": "Test"}'
```

### Test Input Sanitization

```typescript
import { sanitizeHtml } from './lib/sanitize.js';

const malicious = '<script>alert("XSS")</script>';
const safe = sanitizeHtml(malicious); // Returns empty string or sanitized HTML
```

### Test Audit Logging

```typescript
import { getAuditLogs, AuditAction } from './lib/audit-log.js';

const logs = await getAuditLogs({
  action: AuditAction.LOGIN_FAILURE,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
});
```

## Files Created/Modified

- ✅ `apps/backend/src/middleware/csrf.ts` (new)
- ✅ `apps/backend/src/lib/sanitize.ts` (new)
- ✅ `apps/backend/src/lib/audit-log.ts` (new)
- ✅ `apps/backend/src/middleware/security.ts` (modified - enhanced headers)

## Next Steps

1. **Install dependencies**: `pnpm add isomorphic-dompurify`
2. **Add CSRF token endpoint** to your routes
3. **Apply CSRF protection** to state-changing routes
4. **Integrate audit logging** in sensitive operations
5. **Use input sanitization** where needed
6. **Review and test** all security features

## Status

✅ **Security enhancements implementation complete!**

All features are implemented and ready for integration. Remember to install the required dependencies and integrate the features into your routes.
