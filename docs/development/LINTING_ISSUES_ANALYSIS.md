# Frontend Linting Issues Analysis

## Summary

The frontend codebase has **1000+ ESLint warnings** that need to be addressed. These are currently set to "warn" level, so they don't block builds, but they should be fixed for better code quality.

## Issue Categories

### 1. TypeScript `any` Type Usage (~500+ warnings)

**Rule**: `@typescript-eslint/no-explicit-any`

**Common Locations**:

- Event handlers: `(e: any) => {}`
- API responses: `const data: any = await api.get(...)`
- Form data: `const formData: any = {}`
- Table/component props: `(row: any) => {}`

**Impact**: Medium - Reduces type safety and IDE autocomplete

**Fix Strategy**:

- Create proper TypeScript interfaces/types
- Use `unknown` instead of `any` where type is truly unknown
- Leverage existing types from `@myerp/shared-types`

### 2. React Hook Dependencies (~300+ warnings)

**Rule**: `react-hooks/exhaustive-deps`

**Common Pattern**:

```typescript
useEffect(() => {
  fetchData();
}, []); // Missing 'fetchData' in dependencies
```

**Impact**: High - Can cause stale closures and bugs

**Fix Strategy**:

- Add missing dependencies to dependency arrays
- Use `useCallback` for functions used in effects
- Use `useRef` for values that shouldn't trigger re-renders
- Disable rule with comment where intentional (rare cases)

### 3. Unescaped Entities in JSX (~200+ warnings)

**Rule**: `react/no-unescaped-entities`

**Common Pattern**:

```jsx
<div>Don't do this</div>  // Should be: Don&apos;t
<div>He said "hello"</div>  // Should be: &quot;hello&quot;
```

**Impact**: Low - Mostly cosmetic, but can cause issues in some contexts

**Fix Strategy**:

- Replace `'` with `&apos;` or use `{'`}`
- Replace `"` with `&quot;` or use `{"`}`
- Use template literals for complex strings

### 4. Next.js Image Component (~10 warnings)

**Rule**: `@next/next/no-img-element`

**Impact**: Medium - Affects performance and SEO

**Fix Strategy**:

- Replace `<img>` with Next.js `<Image>` component
- Add proper width/height or use `fill` prop
- Handle loading states appropriately

## Priority Fix Order

### Phase 1: Critical (High Priority)

1. **React Hook Dependencies** - Can cause bugs
   - Files with useEffect hooks
   - Focus on data fetching hooks first

### Phase 2: Important (Medium Priority)

2. **TypeScript `any` Types** - Reduces type safety
   - Start with API response types
   - Then event handlers
   - Then form data

3. **Next.js Image Component** - Performance impact
   - Quick wins, easy to fix

### Phase 3: Nice to Have (Low Priority)

4. **Unescaped Entities** - Mostly cosmetic
   - Can be auto-fixed in many cases

## Auto-Fixable Issues

Many of these can be auto-fixed:

```bash
# Auto-fix unescaped entities and some formatting
pnpm --filter frontend-web lint --fix

# This will fix:
# - Unescaped entities (some cases)
# - Formatting issues
# - Some simple dependency issues
```

## Manual Fixes Required

1. **TypeScript `any` types** - Need proper type definitions
2. **React Hook dependencies** - Need careful analysis
3. **Next.js Image** - Need proper sizing/loading

## Recommended Approach

### Step 1: Create Type Definitions

Create a shared types file for common patterns:

- `EventHandlers.ts` - Common event handler types
- `ApiResponses.ts` - API response types (extend shared-types)
- `FormTypes.ts` - Common form data types

### Step 2: Fix React Hooks Systematically

1. Start with data fetching hooks
2. Use `useCallback` for functions in dependencies
3. Document intentional omissions

### Step 3: Batch Fix Remaining Issues

1. Auto-fix what can be auto-fixed
2. Create utility types for common `any` patterns
3. Fix remaining issues file by file

## Tools to Help

### ESLint Auto-Fix

```bash
cd apps/frontend-web
pnpm lint --fix
```

### TypeScript Strict Mode

Consider enabling stricter TypeScript settings gradually:

```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### ESLint Disable Comments

For cases where warnings are intentional:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = await api.get(...);

// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  // Intentional empty deps
}, []);
```

## Estimated Effort

- **Phase 1 (React Hooks)**: 2-3 days
- **Phase 2 (TypeScript types)**: 3-5 days
- **Phase 3 (Images + Entities)**: 1 day
- **Total**: ~1-2 weeks of focused work

## Next Steps

1. ✅ Create this analysis document
2. ⏳ Create shared type definitions
3. ⏳ Fix React Hook dependencies (start with critical files)
4. ⏳ Replace `any` types systematically
5. ⏳ Fix Next.js Image components
6. ⏳ Auto-fix remaining issues

## Files with Most Issues

Based on the lint output, these files have the most warnings:

1. `src/components/KymForm.tsx` - Many `any` types and unescaped entities
2. `src/app/governance/meetings/[id]/page.tsx` - Many `any` types
3. `src/app/members/[id]/page.tsx` - Hook dependencies and `any` types
4. Various general-ledger pages - Hook dependencies

Start with these files for maximum impact.
