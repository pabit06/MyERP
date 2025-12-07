# Request Validation Middleware - Implementation Guide

## ✅ Implementation Complete

The request validation middleware has been successfully implemented! This provides automatic, type-safe validation for all API requests.

## 📚 What Was Created

### 1. Validation Middleware (`src/middleware/validate.ts`)
- `validate()` - Validates request body
- `validateQuery()` - Validates query parameters
- `validateParams()` - Validates route parameters
- `validateAll()` - Validates multiple parts at once

### 2. Common Validation Schemas (`src/validators/common.ts`)
- `paginationSchema` - Standard pagination (page, limit, sortBy, sortOrder)
- `idSchema` - ID parameter validation
- `dateRangeSchema` - Date range filtering
- `searchSchema` - Search/filter parameters
- `paginationWithSearchSchema` - Combined pagination + search

### 3. Pagination Utilities (`src/lib/pagination.ts`)
- `applyPagination()` - Apply pagination to Prisma queries
- `createPaginatedResponse()` - Create standardized paginated responses
- `applySorting()` - Apply sorting to queries

### 4. Updated Express Types (`src/types/express.d.ts`)
- Added `req.validated` - Validated request body
- Added `req.validatedQuery` - Validated query parameters
- Added `req.validatedParams` - Validated route parameters

## 🚀 Usage Examples

### Basic Body Validation

**Before:**
```typescript
router.post('/members', asyncHandler(async (req, res) => {
  const validation = createMemberSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ValidationError('Validation failed', validation.error.errors);
  }
  const data = validation.data;
  // ... rest of handler
}));
```

**After:**
```typescript
import { validate } from '../middleware/validate.js';
import { createMemberSchema } from '../validators/member.validator.js';

router.post('/members', validate(createMemberSchema), asyncHandler(async (req, res) => {
  const data = req.validated; // Type-safe validated data!
  // ... rest of handler
}));
```

### Query Parameter Validation

```typescript
import { validateQuery } from '../middleware/validate.js';
import { paginationSchema } from '../validators/common.js';

router.get('/members', validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder } = req.validatedQuery;
  // ... use pagination params
}));
```

### Route Parameter Validation

```typescript
import { validateParams } from '../middleware/validate.js';
import { idSchema } from '../validators/common.js';

router.get('/members/:id', validateParams(idSchema), asyncHandler(async (req, res) => {
  const { id } = req.validatedParams; // Type-safe!
  // ... use id
}));
```

### Combined Validation

```typescript
import { validateAll } from '../middleware/validate.js';

router.post('/members/:id/kyc', 
  validateAll({
    params: idSchema,
    body: KymFormSchema
  }), 
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const kycData = req.validated;
    // ... handler
  })
);
```

### Pagination Example

```typescript
import { validateQuery } from '../middleware/validate.js';
import { paginationSchema } from '../validators/common.js';
import { applyPagination, createPaginatedResponse } from '../lib/pagination.js';

router.get('/members', validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  const pagination = req.validatedQuery;
  
  // Build query with pagination
  const where = { cooperativeId: tenantId };
  const query = applyPagination({ where }, pagination);
  
  // Execute query
  const [members, total] = await Promise.all([
    prisma.member.findMany(query),
    prisma.member.count({ where }),
  ]);
  
  // Return paginated response
  res.json(createPaginatedResponse(members, total, pagination));
}));
```

## 📋 Migration Guide

### Step 1: Import the middleware
```typescript
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
```

### Step 2: Replace manual validation
**Find:**
```typescript
const validation = schema.safeParse(req.body);
if (!validation.success) {
  throw new ValidationError('Validation failed', validation.error.errors);
}
const data = validation.data;
```

**Replace with:**
```typescript
// Add middleware to route
router.post('/path', validate(schema), handler);

// Use req.validated in handler
const data = req.validated;
```

### Step 3: Update handler
- Remove manual validation code
- Use `req.validated` instead of `validation.data`
- Use `req.validatedQuery` for query params
- Use `req.validatedParams` for route params

## 🎯 Benefits

1. **Less Boilerplate** - No more manual validation in every route
2. **Type Safety** - `req.validated` is properly typed
3. **Consistent Errors** - All validation errors use the same format
4. **Automatic Error Handling** - Errors automatically handled by error middleware
5. **Reusable Schemas** - Common patterns (pagination, etc.) can be reused

## 📝 Example Migration

### Before:
```typescript
router.post('/members', asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  
  const validation = createMemberSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ValidationError('Validation failed', validation.error.errors);
  }
  
  const { firstName, lastName, email } = validation.data;
  // ... rest of code
}));
```

### After:
```typescript
router.post('/members', validate(createMemberSchema), asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { firstName, lastName, email } = req.validated;
  // ... rest of code
}));
```

## 🔍 Type Safety

The validated data is fully typed:

```typescript
// If you use validate(createMemberSchema)
// req.validated will be typed as the inferred type of createMemberSchema
const data: z.infer<typeof createMemberSchema> = req.validated;
```

## ⚠️ Important Notes

1. **Order Matters** - Validation middleware must come before the route handler
2. **Error Handling** - Validation errors are automatically caught by error middleware
3. **Type Assertions** - You may need type assertions in some cases (TypeScript limitation)
4. **Query String Parsing** - Query params come as strings, use transforms in schemas

## 🎓 Best Practices

1. **Create Feature-Specific Validators** - Group related schemas (e.g., `member.validator.ts`)
2. **Use Common Schemas** - Reuse pagination, search, etc. from `common.ts`
3. **Transform Query Params** - Convert strings to numbers/dates in schemas
4. **Combine Validations** - Use `validateAll()` when validating multiple parts

## 📚 Next Steps

1. Migrate existing routes to use the new middleware
2. Create feature-specific validator files
3. Add more common validation patterns as needed
4. Update documentation with examples

---

**Status:** ✅ Ready to use!
**Created:** $(Get-Date)
