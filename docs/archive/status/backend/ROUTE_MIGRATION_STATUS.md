# Route Migration Status - Error Handling

## Overview

This document tracks the migration of routes from old error handling patterns to the new structured error handling system.

## Migration Pattern

### Before (Old Pattern)

```typescript
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### After (New Pattern)

```typescript
import { NotFoundError } from '../lib/errors.js';
import { asyncHandler } from '../middleware/error-handler.js';

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const item = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!item) {
      throw new NotFoundError('Item', req.params.id);
    }
    res.json(item);
  })
);
```

## Migration Status

### ✅ Completed Routes

#### `src/routes/members.ts`

- ✅ `GET /:id/kym` - Migrated to use NotFoundError
- ✅ `PUT /:id/kym` - Migrated to use ValidationError and NotFoundError

#### `src/routes/auth.ts`

- ✅ `POST /login` - Migrated to use BadRequestError and UnauthorizedError
- ✅ `POST /member-login` - Migrated to use BadRequestError, NotFoundError, and UnauthorizedError

### ⏳ In Progress

#### `src/routes/members.ts`

- ⏳ ~25 more routes need migration
- Common patterns to migrate:
  - `res.status(404)` → `throw new NotFoundError()`
  - `res.status(400)` → `throw new ValidationError()` or `throw new BadRequestError()`
  - `res.status(500)` → Remove (handled by error middleware)
  - `try-catch` blocks → Use `asyncHandler` wrapper

### ❌ Not Started

#### High Priority Routes

- ❌ `src/routes/accounting.ts` - Critical for financial operations
- ❌ `src/routes/savings.ts` - Core CBS functionality
- ❌ `src/routes/loans.ts` - Core CBS functionality
- ❌ `src/routes/shares.ts` - Core functionality

#### Medium Priority Routes

- ❌ `src/routes/dms.ts` - Document management
- ❌ `src/routes/hrm.ts` - Human resources
- ❌ `src/routes/governance.ts` - Governance features
- ❌ `src/routes/compliance.ts` - Compliance features
- ❌ `src/routes/reports.ts` - Reporting
- ❌ `src/routes/workflow.ts` - Workflow engine
- ❌ `src/routes/cbs/day-book.ts` - Day book operations

#### Lower Priority Routes

- ❌ `src/routes/darta.ts` - Document routing
- ❌ `src/routes/patra-chalani.ts` - Document routing
- ❌ `src/routes/notifications.ts` - Notifications
- ❌ `src/routes/subscription.ts` - Subscription management
- ❌ `src/routes/saas.ts` - SaaS operations
- ❌ `src/routes/system-admin.ts` - System administration
- ❌ `src/routes/public.ts` - Public routes
- ❌ `src/routes/onboarding.ts` - Onboarding
- ❌ `src/routes/inventory.ts` - Inventory management
- ❌ `src/routes/member-workflow.ts` - Member workflow

## Error Class Usage Guide

### When to Use Which Error

1. **ValidationError** (400)
   - Schema validation failures
   - Invalid input data format

   ```typescript
   const result = schema.safeParse(req.body);
   if (!result.success) {
     throw new ValidationError('Invalid input', result.error.errors);
   }
   ```

2. **NotFoundError** (404)
   - Resource not found
   - Record doesn't exist

   ```typescript
   if (!item) {
     throw new NotFoundError('Item', id);
   }
   ```

3. **UnauthorizedError** (401)
   - Authentication required
   - Invalid credentials

   ```typescript
   if (!isValidPassword) {
     throw new UnauthorizedError('Invalid credentials');
   }
   ```

4. **ForbiddenError** (403)
   - Permission denied
   - Insufficient privileges

   ```typescript
   if (!hasPermission) {
     throw new ForbiddenError('You do not have permission');
   }
   ```

5. **BadRequestError** (400)
   - General bad requests
   - Missing required fields

   ```typescript
   if (!email || !password) {
     throw new BadRequestError('Email and password are required');
   }
   ```

6. **ConflictError** (409)
   - Resource conflicts
   - Duplicate entries

   ```typescript
   if (existing) {
     throw new ConflictError('Resource already exists');
   }
   ```

7. **BusinessLogicError** (422)
   - Business rule violations
   - Domain-specific errors
   ```typescript
   if (balance < amount) {
     throw new BusinessLogicError('Insufficient funds');
   }
   ```

## Migration Checklist

For each route:

- [ ] Import error classes: `import { NotFoundError, ValidationError, ... } from '../lib/errors.js';`
- [ ] Import asyncHandler: `import { asyncHandler } from '../middleware/error-handler.js';`
- [ ] Wrap route handler with `asyncHandler`
- [ ] Replace `res.status(404)` with `throw new NotFoundError()`
- [ ] Replace `res.status(400)` with `throw new ValidationError()` or `throw new BadRequestError()`
- [ ] Replace `res.status(401)` with `throw new UnauthorizedError()`
- [ ] Replace `res.status(403)` with `throw new ForbiddenError()`
- [ ] Replace `res.status(409)` with `throw new ConflictError()`
- [ ] Remove `res.status(500)` error handlers (handled by middleware)
- [ ] Remove try-catch blocks (handled by asyncHandler)
- [ ] Test the route to ensure errors are handled correctly

## Statistics

- **Total Route Files:** 23
- **Routes Migrated:** 4
- **Routes Remaining:** ~100+ individual routes
- **Progress:** ~4% complete

## Notes

- Old and new patterns can coexist during migration
- Error middleware automatically handles all errors
- Migration can be done incrementally
- No breaking changes to existing functionality
- All routes benefit from improved error handling even if not migrated yet

---

**Last Updated:** 2025-01-27  
**Next Steps:** Continue migrating high-priority routes (accounting, savings, loans)
