# Frontend Feature-Based Structure Migration Guide

## Overview

The frontend has been partially migrated to a feature-based structure. This guide documents the migration pattern and remaining work.

## Completed

1. ✅ Created `features/` directory structure for all features
2. ✅ Moved savings components to `features/savings/components/`
3. ✅ Moved documents components to `features/documents/components/`
4. ✅ Moved chart components to `features/dashboard/components/`
5. ✅ Moved member-related components to `features/members/components/`
6. ✅ Moved HRM components to `features/hrm/components/`
7. ✅ Organized shared components in `components/shared/`
8. ✅ Created barrel exports (`index.ts`) for features
9. ✅ Organized static assets in `public/images/`

## Migration Pattern

### For Pages (app router)

**Before:**
```tsx
import SavingsHeader from './components/SavingsHeader';
```

**After:**
```tsx
import { SavingsHeader } from '@/features/savings';
```

### For Components

**Before:**
```tsx
import ChartWrapper from '../../components/charts/ChartWrapper';
```

**After:**
```tsx
import { ChartWrapper } from '@/features/dashboard';
```

### For Shared Components

**Before:**
```tsx
import NepaliDatePicker from '@/components/NepaliDatePicker';
```

**After:**
```tsx
import { NepaliDatePicker } from '@/components/shared';
```

## Remaining Work

### 1. Update Import Statements

Update all import statements in:
- `app/**/*.tsx` files
- Component files that import from old locations

### 2. Create Feature API Modules

Create API modules for each feature:
- `features/savings/api/savings.api.ts`
- `features/members/api/members.api.ts`
- etc.

### 3. Move Feature-Specific Hooks

Move hooks to feature folders:
- `features/savings/hooks/useSavings.ts`
- `features/members/hooks/useMembers.ts`
- etc.

### 4. Update tsconfig.json Paths

Add path aliases:
```json
{
  "compilerOptions": {
    "paths": {
      "@/features/*": ["./src/features/*"],
      "@/components/shared": ["./src/components/shared"]
    }
  }
}
```

## Feature Structure

```
features/
  ├── auth/
  │   ├── components/
  │   ├── hooks/
  │   ├── api/
  │   └── index.ts
  ├── dashboard/
  │   ├── components/  ✅ (charts moved here)
  │   └── index.ts
  ├── accounting/
  ├── members/
  │   ├── components/  ✅ (KymForm, etc. moved here)
  │   └── index.ts
  ├── savings/
  │   ├── components/  ✅ (all savings components moved here)
  │   └── index.ts
  ├── loans/
  ├── shares/
  ├── compliance/
  ├── governance/
  ├── hrm/
  │   ├── components/  ✅ (PayrollPreviewModal moved here)
  │   └── index.ts
  ├── documents/
  │   ├── components/  ✅ (all document components moved here)
  │   ├── types/
  │   └── index.ts
  └── reports/
```

## Static Assets

Static assets have been organized:
```
public/
  ├── images/
  │   ├── logos/      (myerp-logo.png)
  │   ├── icons/
  │   └── placeholders/
  ├── documents/      (templates)
  ├── nepali.datepicker.v5.0.6.min.css
  └── nepali.datepicker.v5.0.6.min.js
```

## Next Steps

1. Update all import statements to use feature-based imports
2. Create API modules for each feature
3. Move feature-specific hooks
4. Test all pages to ensure imports work
5. Remove old component directories after migration is complete

