# Backend Error Handling Guide

## Overview

The backend now uses a structured error handling system with custom error classes and enhanced error middleware. This provides consistent error responses, better debugging, and improved user experience.

## Error Classes

All error classes are available in `src/lib/errors.ts`:

### Available Error Classes

1. **AppError** - Base error class (500)
2. **ValidationError** - Validation failures (400)
3. **NotFoundError** - Resource not found (404)
4. **UnauthorizedError** - Authentication required (401)
5. **ForbiddenError** - Permission denied (403)
6. **ConflictError** - Resource conflicts (409)
7. **BadRequestError** - General bad requests (400)
8. **InternalServerError** - Server errors (500)
9. **ServiceUnavailableError** - Service unavailable (503)
10. **DatabaseError** - Database errors (500)
11. **BusinessLogicError** - Business rule violations (422)

## Usage Examples

### Basic Usage

```typescript
import { NotFoundError, ValidationError, asyncHandler } from '../lib/errors.js';

// Using asyncHandler wrapper (recommended)
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundError('Item', id);
    }

    res.json(item);
  })
);
```

### Validation Errors

```typescript
import { ValidationError } from '../lib/errors.js';

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw new ValidationError('Invalid input data', result.error.errors);
    }

    // Process valid data
    const item = await prisma.item.create({ data: result.data });
    res.json(item);
  })
);
```

### Business Logic Errors

```typescript
import { BusinessLogicError } from '../lib/errors.js';

router.post(
  '/transfer',
  asyncHandler(async (req: Request, res: Response) => {
    const { fromAccount, toAccount, amount } = req.body;

    const balance = await getAccountBalance(fromAccount);

    if (balance < amount) {
      throw new BusinessLogicError('Insufficient funds', {
        currentBalance: balance,
        requestedAmount: amount,
      });
    }

    // Process transfer
    res.json({ success: true });
  })
);
```

### Conflict Errors

```typescript
import { ConflictError } from '../lib/errors.js';

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.member.findUnique({
      where: { memberNumber: req.body.memberNumber },
    });

    if (existing) {
      throw new ConflictError('Member with this number already exists', {
        memberNumber: req.body.memberNumber,
      });
    }

    // Create member
    res.json(member);
  })
);
```

## Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // Only in development mode
}
```

### Example Responses

**404 Not Found:**

```json
{
  "error": "Member with identifier '123' not found",
  "code": "NOT_FOUND"
}
```

**400 Validation Error:**

```json
{
  "error": "Invalid input data",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email format"
    }
  ]
}
```

**409 Conflict:**

```json
{
  "error": "Member with this number already exists",
  "code": "CONFLICT",
  "details": {
    "memberNumber": "M001"
  }
}
```

## Prisma Error Handling

Prisma errors are automatically handled by the error middleware:

- **P2002** (Unique constraint) → 409 Conflict
- **P2025** (Record not found) → 404 Not Found
- **P2003** (Foreign key violation) → 400 Bad Request
- **P2014** (Required relation) → 400 Bad Request
- Other Prisma errors → 500 Database Error

## Migration Guide

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
import { NotFoundError, asyncHandler } from '../lib/errors.js';

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

## Benefits

1. **Consistent Error Responses** - All errors follow the same format
2. **Better Debugging** - Error codes and details help identify issues
3. **Automatic Logging** - All errors are automatically logged with context
4. **Type Safety** - TypeScript ensures correct error usage
5. **Less Boilerplate** - No need for try-catch in every route
6. **Prisma Integration** - Automatic handling of Prisma errors

## Best Practices

1. **Always use `asyncHandler`** - Wraps async routes and catches errors
2. **Use specific error types** - Choose the most appropriate error class
3. **Provide helpful messages** - Error messages should be user-friendly
4. **Include details in development** - Use `details` parameter for debugging
5. **Don't catch errors unnecessarily** - Let the error middleware handle them
6. **Log business logic errors** - Important errors should be logged

## Error Middleware

The error middleware (`src/middleware/error-handler.ts`) automatically:

- Handles all AppError instances
- Handles Prisma errors
- Logs errors with context (path, method, userId, etc.)
- Returns appropriate HTTP status codes
- Includes details in development mode only

## Testing

When testing error handling:

```typescript
import { NotFoundError } from '../lib/errors.js';

// In your test
expect(() => {
  throw new NotFoundError('Item', '123');
}).toThrow(NotFoundError);

// Or test the response
const response = await request(app).get('/items/invalid-id').expect(404);

expect(response.body).toMatchObject({
  error: expect.any(String),
  code: 'NOT_FOUND',
});
```

---

**Note:** The error middleware is already configured in `src/index.ts`. All routes will automatically use it.
