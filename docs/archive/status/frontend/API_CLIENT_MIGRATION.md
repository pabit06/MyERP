# API Client Migration Guide

This guide helps you migrate from scattered `fetch()` calls to the centralized API client.

## ✅ What's Been Done

1. **Created centralized API client** (`src/lib/api/client.ts`)
   - Automatic token management
   - Consistent error handling
   - Request/response interceptors
   - TypeScript support

2. **Updated AuthContext** to integrate with API client
   - Token getter configured
   - Unauthorized handler configured

3. **Example migrations:**
   - `app/dashboard/page.tsx`
   - `app/members/page.tsx`

## 🔄 Migration Pattern

### Before (Old Pattern)

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// In component
const fetchData = async () => {
  try {
    const response = await fetch(`${API_URL}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const data = await response.json();
      setData(data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### After (New Pattern)

```typescript
import { apiClient } from '@/lib/api';

// In component
const fetchData = async () => {
  try {
    const data = await apiClient.get('/members');
    setData(data);
  } catch (error) {
    // Error handling is automatic (toast shown, logged)
    // Only handle if you need custom behavior
  }
};
```

## 📝 Step-by-Step Migration

### Step 1: Remove API_URL constant

```typescript
// ❌ Remove this
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
```

### Step 2: Import API client

```typescript
// ✅ Add this
import { apiClient } from '@/lib/api';
```

### Step 3: Replace fetch calls

#### GET Request

```typescript
// ❌ Old
const response = await fetch(`${API_URL}/members`, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await response.json();

// ✅ New
const data = await apiClient.get('/members');
```

#### POST Request

```typescript
// ❌ Old
const response = await fetch(`${API_URL}/members`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(memberData),
});
const data = await response.json();

// ✅ New
const data = await apiClient.post('/members', memberData);
```

#### PUT/PATCH Request

```typescript
// ✅ New
const data = await apiClient.put('/members/123', memberData);
const data = await apiClient.patch('/members/123', { status: 'active' });
```

#### DELETE Request

```typescript
// ✅ New
await apiClient.delete('/members/123');
```

#### File Upload

```typescript
// ❌ Old
const formData = new FormData();
formData.append('file', file);
const response = await fetch(`${API_URL}/upload`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

// ✅ New
const formData = new FormData();
formData.append('file', file);
const data = await apiClient.upload('/upload', formData);
```

### Step 4: Handle Response Types

The API client automatically handles both response formats:

- `{ data: T }` - Returns `T`
- Direct `T` - Returns `T`

If you need to access other response properties:

```typescript
// If backend returns { data: members, meta: { total: 100 } }
const response = await apiClient.get<{ data: Member[]; meta: { total: number } }>('/members');
// response will be the full object, not just data
```

### Step 5: Error Handling

#### Default Behavior (Recommended)

```typescript
// Errors are automatically:
// - Shown as toast notifications
// - Logged to console (dev) or error service (prod)
// - 401 errors trigger logout and redirect

try {
  const data = await apiClient.get('/members');
} catch (error) {
  // Only handle if you need custom behavior
  if (error instanceof ApiError && error.status === 404) {
    // Handle 404 specifically
  }
}
```

#### Skip Error Toast

```typescript
// For optional/background requests
const data = await apiClient.get('/optional-endpoint', {
  skipErrorToast: true,
});
```

#### Skip Auth Token

```typescript
// For public endpoints
const data = await apiClient.get('/public/data', {
  skipAuth: true,
});
```

## 🎯 Common Patterns

### Loading States

```typescript
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const result = await apiClient.get('/data');
    setData(result);
  } catch (error) {
    // Error handled automatically
  } finally {
    setLoading(false);
  }
};
```

### Multiple Parallel Requests

```typescript
const fetchAll = async () => {
  try {
    const [members, accounts, loans] = await Promise.all([
      apiClient.get('/members'),
      apiClient.get('/accounts'),
      apiClient.get('/loans'),
    ]);
    // Use results
  } catch (error) {
    // Handle error
  }
};
```

### Conditional Requests

```typescript
const fetchIfEnabled = async () => {
  if (!hasModule('cbs')) return;

  try {
    const data = await apiClient.get('/cbs/data', {
      skipErrorToast: true, // Optional endpoint
    });
  } catch (error) {
    // Silently fail for optional features
  }
};
```

## 📋 Files to Migrate

### High Priority (Frequently Used)

- [ ] `app/documents/page.tsx` ✅ (partially done)
- [ ] `app/members/[id]/page.tsx`
- [ ] `app/savings/page.tsx`
- [ ] `app/compliance/ttr-queue/page.tsx`
- [ ] `app/governance/**/*.tsx`
- [ ] `app/hrm/**/*.tsx`

### Medium Priority

- [ ] All files in `app/general-ledger/`
- [ ] All files in `app/reports/`
- [ ] All files in `app/shares/`
- [ ] Feature components in `features/`

### Low Priority

- [ ] Test files
- [ ] Utility files

## 🔍 Finding Files to Migrate

Search for these patterns:

```bash
# Find files with API_URL constant
grep -r "API_URL.*process.env" apps/frontend-web/src

# Find files with fetch calls
grep -r "fetch(\`\${API_URL" apps/frontend-web/src

# Find files with Authorization headers
grep -r "Authorization.*Bearer" apps/frontend-web/src
```

## ⚠️ Important Notes

1. **Token Management**: No need to manually add `Authorization` header - it's automatic
2. **Error Handling**: Default error handling shows toasts and logs errors
3. **Type Safety**: Use TypeScript generics for response types: `apiClient.get<Member[]>('/members')`
4. **Base URL**: Configured automatically from `NEXT_PUBLIC_API_URL`
5. **401 Handling**: Automatically logs out and redirects to `/login`

## 🐛 Troubleshooting

### "Cannot find module '@/lib/api'"

- Ensure `tsconfig.json` has path alias: `"@/*": ["./src/*"]`

### "Token not found"

- Ensure `AuthProvider` is wrapping your app
- Check that `apiClient.setTokenGetter()` is called in `AuthContext`

### Errors not showing toasts

- Check that `react-hot-toast` is installed and `<Toaster />` is in your layout

### Type errors

- Use explicit types: `apiClient.get<YourType>('/endpoint')`
- Check backend response format matches your type

## ✅ Migration Checklist

For each file:

- [ ] Remove `API_URL` constant
- [ ] Import `apiClient` from `@/lib/api`
- [ ] Replace `fetch()` calls with `apiClient` methods
- [ ] Remove manual `Authorization` headers
- [ ] Remove manual error handling (if using defaults)
- [ ] Add TypeScript types for responses
- [ ] Test the migrated code
- [ ] Remove unused imports

## 📚 Additional Resources

- See `PROJECT_IMPROVEMENTS.md` for full context
- API client source: `src/lib/api/client.ts`
- Example usage: `app/dashboard/page.tsx`
