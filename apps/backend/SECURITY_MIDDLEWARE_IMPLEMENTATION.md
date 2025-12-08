# Security Middleware Implementation

**Implementation Date:** 2025-01-27  
**Status:** ✅ Complete

---

## Overview

This document describes the implementation of rate limiting and security middleware for the MyERP backend. The implementation provides protection against DDoS attacks, brute force attempts, and common web vulnerabilities.

---

## What Was Implemented

### 1. Rate Limiting

#### General API Rate Limiter (`apiLimiter`)

- **Limit:** 100 requests per 15 minutes per IP
- **Applied to:** All API routes except `/health` and `/auth`
- **Purpose:** Prevent DDoS attacks and API abuse
- **Response:** 429 Too Many Requests with error message

#### Authentication Rate Limiter (`authLimiter`)

- **Limit:** 5 requests per 15 minutes per IP
- **Applied to:** `/api/auth/*` routes
- **Special Feature:** Only counts failed requests (`skipSuccessfulRequests: true`)
- **Purpose:** Prevent brute force attacks on login endpoints
- **Response:** 429 Too Many Requests with error message

#### Password Reset Rate Limiter (`passwordResetLimiter`)

- **Limit:** 3 requests per hour per IP
- **Applied to:** Password reset endpoints (when implemented)
- **Purpose:** Prevent abuse of password reset functionality
- **Response:** 429 Too Many Requests with error message

### 2. Security Headers (Helmet)

The following security headers are configured:

- **Content Security Policy (CSP):** Restricts resource loading to prevent XSS attacks
- **X-Content-Type-Options:** Prevents MIME type sniffing
- **X-Frame-Options:** Prevents clickjacking attacks
- **X-XSS-Protection:** Enables browser XSS protection
- **Strict-Transport-Security:** Forces HTTPS (in production)
- **Referrer-Policy:** Controls referrer information

### 3. Request Size Limits

- **JSON payloads:** Maximum 10MB
- **URL-encoded payloads:** Maximum 10MB
- **Purpose:** Prevent oversized payload attacks

### 4. Trust Proxy Configuration

- **Enabled in production:** Automatically trusts proxy headers
- **Purpose:** Ensures rate limiting works correctly behind reverse proxies (nginx, Cloudflare, etc.)

---

## Files Created

### `apps/backend/src/middleware/security.ts`

Contains all security middleware configurations:

- Rate limiters (apiLimiter, authLimiter, passwordResetLimiter)
- Helmet configuration
- Request size limits
- Trust proxy configuration

---

## Files Modified

### `apps/backend/src/index.ts`

- Added security middleware imports
- Integrated helmet (security headers) early in middleware chain
- Added trust proxy configuration
- Applied request size limits to `express.json()` and `express.urlencoded()`
- Applied `apiLimiter` to all API routes
- Applied `authLimiter` to auth routes

### `apps/backend/package.json`

- Added `express-rate-limit@8.2.1`
- Added `helmet@8.1.0`

---

## Configuration

### Environment Variables

No new environment variables are required. The middleware uses existing configuration from `apps/backend/src/config/env.ts`.

### Rate Limiting Configuration

Rate limits can be adjusted in `apps/backend/src/middleware/security.ts`:

```typescript
// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Adjust this value
  // ...
});

// Auth rate limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Adjust this value
  // ...
});
```

### Helmet Configuration

CSP and other security headers can be adjusted in `apps/backend/src/middleware/security.ts`:

```typescript
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      // Adjust CSP directives as needed
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      // ...
    },
  },
  // ...
});
```

---

## Usage

### Applying Rate Limiters to New Routes

```typescript
import { apiLimiter, authLimiter } from '../middleware/security.js';

// For general API routes
app.use('/api/your-route', apiLimiter, yourRoutes);

// For auth routes
app.use('/api/auth', authLimiter, authRoutes);
```

### Custom Rate Limiter

You can create custom rate limiters for specific endpoints:

```typescript
import rateLimit from 'express-rate-limit';

export const customLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many requests',
    code: 'CUSTOM_RATE_LIMIT',
  },
});
```

---

## Testing

### Test Rate Limiting

1. **Test General API Rate Limiter:**

   ```bash
   # Make 101 requests quickly
   for i in {1..101}; do curl http://localhost:3001/api/members; done
   # The 101st request should return 429
   ```

2. **Test Auth Rate Limiter:**
   ```bash
   # Make 6 failed login attempts
   for i in {1..6}; do curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"wrong"}'; done
   # The 6th request should return 429
   ```

### Test Security Headers

```bash
curl -I http://localhost:3001/api/health
# Check for security headers:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - X-XSS-Protection: 1; mode=block
# - Content-Security-Policy: ...
```

---

## Monitoring

Rate limit violations are logged via Winston:

```typescript
logger.warn('Rate limit exceeded', {
  ip: req.ip,
  path: req.path,
  method: req.method,
});
```

Monitor these logs to identify potential attacks or legitimate users hitting limits.

---

## Production Considerations

1. **Trust Proxy:** Ensure `NODE_ENV=production` is set so trust proxy is enabled
2. **Rate Limit Storage:** By default, rate limits are stored in memory. For distributed systems, consider using Redis:

   ```typescript
   import RedisStore from 'rate-limit-redis';
   import Redis from 'ioredis';

   const redis = new Redis(process.env.REDIS_URL);

   export const apiLimiter = rateLimit({
     store: new RedisStore({
       client: redis,
     }),
     // ... other options
   });
   ```

3. **CSP Adjustments:** Adjust Content Security Policy based on your frontend requirements
4. **Rate Limit Tuning:** Monitor and adjust rate limits based on actual usage patterns

---

## Benefits

✅ **DDoS Protection:** Prevents overwhelming the server with too many requests  
✅ **Brute Force Protection:** Limits login attempts to prevent password guessing  
✅ **Security Headers:** Protects against common web vulnerabilities (XSS, clickjacking, etc.)  
✅ **Request Size Limits:** Prevents oversized payload attacks  
✅ **Production Ready:** Works correctly behind reverse proxies

---

## Related Documentation

- [Express Rate Limit Documentation](https://github.com/express-rate-limit/express-rate-limit)
- [Helmet Documentation](https://helmetjs.github.io/)
- [Error Handling Implementation](./ERROR_HANDLING_IMPLEMENTATION.md)

---

**Status:** ✅ Complete and production-ready
