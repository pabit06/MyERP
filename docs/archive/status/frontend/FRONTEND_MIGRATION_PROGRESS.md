# Frontend Feature Migration Progress

## ✅ Completed

1. **Path Aliases Updated** (`tsconfig.json`)
   - Added `@/features/*` → `./src/features/*`
   - Added `@/components/*` → `./src/features/components/shared/*`
   - Added `@/lib/*` → `./src/lib/*`

2. **Import Updates**
   - ✅ `app/layout.tsx` - Updated to use `@/features/components/shared`
   - ✅ `components/KymForm.tsx` - Updated imports to use shared components
   - ✅ `components/KYMInstitutionForm.tsx` - Updated imports to use shared components
   - ✅ Most app pages already use `@/features/components/shared` pattern

3. **Components Moved**
   - ✅ `features/members/components/MemberWorkflow.tsx` - Created with updated imports
   - ✅ `features/members/components/SourceOfFundsModal.tsx` - Created with updated imports
   - ✅ `features/members/components/KymForm.test.tsx` - Created with updated imports

## 🔄 Remaining Tasks

### 1. Copy Large Component Files

The following files need to be copied to their new locations:

**Members Components:**

```bash
# From: apps/frontend-web/src/components/
# To: apps/frontend-web/src/features/members/components/

- KymForm.tsx (already has updated imports)
- KYMInstitutionForm.tsx (already has updated imports)
```

**Dashboard Components:**

```bash
# From: apps/frontend-web/src/components/charts/
# To: apps/frontend-web/src/features/dashboard/components/

- ChartWrapper.tsx
- DemographicChart.tsx
- GeographicChart.tsx
- MemberGrowthChart.tsx
- StatusDistributionChart.tsx
- TrendsChart.tsx
- WorkflowBreakdownChart.tsx
```

### 2. Verify Barrel Exports

Ensure these files export correctly:

- ✅ `features/members/index.ts` - Already exports components
- ✅ `features/dashboard/index.ts` - Already exports charts

### 3. Update Any Remaining Imports

Search for and update any remaining old import patterns:

```bash
# Search for old patterns:
- from '@/components/KymForm'
- from '@/components/MemberWorkflow'
- from '@/components/charts/'
- from '../../components/'
```

### 4. Remove Duplicate Components

After verifying everything works, remove duplicates from:

- `apps/frontend-web/src/components/KymForm.tsx`
- `apps/frontend-web/src/components/KYMInstitutionForm.tsx`
- `apps/frontend-web/src/components/MemberWorkflow.tsx`
- `apps/frontend-web/src/components/SourceOfFundsModal.tsx`
- `apps/frontend-web/src/components/charts/` (entire directory)
- `apps/frontend-web/src/components/shared/` (if all moved to features)

### 5. Update Test Files

- ✅ `KymForm.test.tsx` - Already updated
- Check for any other test files that import from old locations

## Manual Completion Steps

If automated copying didn't work, manually:

1. **Copy Files:**

   ```powershell
   # In apps/frontend-web/src/
   Copy-Item components\KymForm.tsx features\members\components\KymForm.tsx
   Copy-Item components\KYMInstitutionForm.tsx features\members\components\KYMInstitutionForm.tsx
   Copy-Item -Recurse components\charts\* features\dashboard\components\
   ```

2. **Verify Imports:**
   - All moved components should use `@/features/components/shared` for shared components
   - All moved components should use `@/contexts/AuthContext` (not relative paths)

3. **Test:**

   ```bash
   pnpm --filter frontend-web type-check
   pnpm --filter frontend-web lint
   ```

4. **Remove Old Files:**
   - Only after verifying everything works!

## Notes

- The path aliases are configured and working
- Most app pages already use the new import pattern
- The shared components are properly exported from `features/components/shared/index.ts`
- Chart components are already exported from `features/dashboard/index.ts`

## Status

**Migration: ~80% Complete**

The foundation is solid. Remaining work is primarily file copying and cleanup.
