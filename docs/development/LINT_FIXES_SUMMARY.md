# Lint Fixes Summary

## Date: 2024-12-19

## Overview

Comprehensive linting fixes have been applied across the codebase using automated scripts and manual fixes.

## Fixes Applied

### ✅ Completed Fixes

1. **TypeScript Compilation Errors** (Critical)
   - ✅ Fixed JWT `expiresIn` type issue in `apps/backend/src/lib/auth.ts`
   - ✅ Fixed unused variable in `apps/backend/src/lib/hooks.ts`
   - ✅ Fixed unused import comment in `apps/backend/src/index.ts`

2. **@ts-ignore to @ts-expect-error**
   - ✅ Fixed in `apps/backend/src/services/aml/cron-setup.ts`
   - ✅ All other instances were already using `@ts-expect-error`

3. **ESLint Auto-Fixes**
   - ✅ Ran `eslint --fix` on backend (fixed auto-fixable issues)
   - ✅ Ran `eslint --fix` on frontend (fixed auto-fixable issues)
   - ✅ Fixed unused variable naming in `apps/frontend-web/src/app/general-ledger/assets/page.tsx`

4. **Prettier Formatting**
   - ✅ Ran Prettier on all files to ensure consistent formatting

## Remaining Issues

### Backend (275 warnings)

- **Type warnings**: 275 instances of `any` type usage
  - These are warnings, not errors
  - Most are in hooks, routes, and service files
  - Consider replacing with proper types over time

### Frontend (Many warnings)

- **React Hook dependencies**: Missing dependencies in `useEffect` hooks
  - Files affected: compliance pages, documents, governance, etc.
  - Fix: Add missing dependencies or use `useCallback`/`useMemo`
- **Unused imports/variables**: Various files
  - Some may be intentionally unused (e.g., for future use)
  - Review and remove if truly unused
- **Type warnings**: `any` type usage
  - Similar to backend, consider proper typing

- **Unescaped entities in JSX**: Quotes and apostrophes
  - Can be fixed by using `&quot;` and `&apos;` or template literals

## Scripts Created

1. **`scripts/fix-common-issues.js`**
   - Runs ESLint auto-fix on backend and frontend
   - Runs Prettier formatting
   - Can be run with: `node scripts/fix-common-issues.js`

2. **`scripts/fix-lint-issues.js`**
   - Framework for custom fixes (can be extended)
   - Currently handles @ts-ignore replacement

## Recommendations

### High Priority (Blocking Issues)

- ✅ **DONE**: All TypeScript compilation errors fixed

### Medium Priority (Code Quality)

1. **Replace `any` types gradually**
   - Start with frequently used types
   - Create proper interfaces/types for common patterns
   - Focus on hooks, routes, and services

2. **Fix React Hook dependencies**
   - Review each `useEffect` hook
   - Add missing dependencies or wrap functions in `useCallback`
   - Use ESLint disable comments only when necessary

3. **Remove unused imports**
   - Review each file with unused imports
   - Remove if truly unused
   - Keep if needed for future development

### Low Priority (Nice to Have)

1. **Fix unescaped entities in JSX**
   - Replace quotes/apostrophes with HTML entities
   - Or use template literals where appropriate

2. **Improve type safety**
   - Gradually replace `any` with proper types
   - Add type definitions for API responses
   - Use TypeScript strict mode where possible

## Next Steps

1. ✅ Run the fix scripts (completed)
2. Review and fix React Hook dependencies manually
3. Gradually improve type safety by replacing `any` types
4. Set up pre-commit hooks to prevent new linting issues
5. Consider adding stricter ESLint rules for new code

## Running the Fix Scripts

```bash
# Run comprehensive fixes
node scripts/fix-common-issues.js

# Or run individual commands
cd apps/backend && pnpm lint --fix
cd apps/frontend-web && pnpm lint --fix
pnpm format
```

## Notes

- All critical TypeScript compilation errors have been fixed
- The codebase now has consistent formatting
- Remaining issues are mostly warnings that don't block compilation
- Consider addressing warnings incrementally during regular development
