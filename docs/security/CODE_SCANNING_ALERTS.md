# Code Scanning Alerts - Analysis & Fixes

## Overview

This document tracks GitHub CodeQL security alerts and their resolutions.

## Common CodeQL Alert Types

### 1. Format String Injection

**Status**: ✅ Protected in logger.ts

**Location**: `apps/backend/src/config/logger.ts`

**Fix Applied**: Format specifiers are escaped to prevent format string injection:

```typescript
safeMessage = message.replace(/%/g, '%%');
```

### 2. SQL Injection

**Status**: ✅ Protected (Prisma ORM)

**Note**: All database queries use Prisma ORM which provides parameterized queries. Raw queries use Prisma's `$queryRaw` with template literals which are safe.

**Example Safe Usage**:

```typescript
await prisma.$queryRaw`
  SELECT * FROM table WHERE id = ${cooperativeId}
`;
```

### 3. XSS (Cross-Site Scripting)

**Status**: ✅ Protected

- Backend: Input sanitization in `apps/backend/src/lib/sanitize.ts`
- Frontend: React automatically escapes content
- Third-party libraries: `nepali.datepicker.v5.0.6.min.js` uses innerHTML (external library)

### 4. Path Traversal

**Status**: ✅ Protected

**Location**: `apps/backend/src/lib/sanitize.ts`

**Fix**: Path traversal patterns are removed:

```typescript
sanitized = sanitized.replace(/\.\./g, '');
sanitized = sanitized.replace(/[/\\]/g, '');
```

### 5. Command Injection

**Status**: ✅ No issues found

No use of `child_process.exec()` or `child_process.spawn()` with user input.

### 6. Insecure Random Number Generation

**Status**: ⚠️ Only in seed scripts (acceptable)

**Location**: Seed scripts only (`apps/backend/scripts/`)

**Note**: `Math.random()` is only used in seed scripts for generating test data, not for security-sensitive operations.

### 7. Hardcoded Secrets

**Status**: ✅ Protected

All secrets are loaded from environment variables via `apps/backend/src/config/env.ts`.

## Resolved Alerts

### Alert #14: Use of externally-controlled format string

**Status**: ✅ Resolved

**Issue**: Format string vulnerability in console.log statements.

**Resolution**:

- Logger already has format string protection
- Console.log statements use safe template literals instead of format specifiers

### Alert #168: Format string injection in winston logger

**Status**: ✅ Resolved

**Issue**: `winston.format.splat()` enables format string interpolation, which can be vulnerable to format string injection if user-controlled input is logged.

**Location**: `apps/backend/src/config/logger.ts`

**Resolution**:

- Added `escapeFormatSpecifiers` format that escapes format specifiers (`%` → `%%`) BEFORE `splat()` processes them
- Applied to both `logFormat` (production) and `consoleFormat` (development)
- This ensures user-controlled input cannot be interpreted as format strings

**Fix Applied**:

```typescript
// Custom format that escapes format specifiers to prevent format string injection
// This must run BEFORE winston.format.splat() to prevent format string vulnerabilities
const escapeFormatSpecifiers = winston.format((info) => {
  if (info.message && typeof info.message === 'string') {
    info.message = info.message.replace(/%/g, '%%');
  }
  return info;
})();

// Applied BEFORE splat() in both formats
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  escapeFormatSpecifiers, // Escape format specifiers before splat() processes them
  redactFormat,
  winston.format.errors({ stack: true }),
  winston.format.splat(), // Safe to use after escaping format specifiers
  winston.format.json()
);
```

## Monitoring

### Regular Checks

1. Run `pnpm audit` weekly
2. Review GitHub CodeQL alerts after each push
3. Check Dependabot alerts for dependency vulnerabilities

### GitHub Actions

CodeQL analysis runs automatically on:

- Every push to `main` branch
- Every pull request
- Daily at 2 AM UTC (scheduled)

## Best Practices

1. **Never use format specifiers with user input**:

   ```typescript
   // ❌ Bad
   console.log('User: %s', userInput);

   // ✅ Good
   console.log('User:', userInput);
   ```

2. **Always use Prisma ORM for database queries**:

   ```typescript
   // ✅ Safe
   await prisma.user.findUnique({ where: { id } });
   ```

3. **Sanitize all user input**:

   ```typescript
   import { sanitizeText } from '../lib/sanitize.js';
   const safe = sanitizeText(userInput);
   ```

4. **Use environment variables for secrets**:
   ```typescript
   // ✅ Good
   const secret = env.JWT_SECRET;
   ```

## Resources

- [GitHub CodeQL Documentation](https://codeql.github.com/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#security-best-practices)
