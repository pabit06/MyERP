# Quick Fix: Remove Duplicate Components

## Problem
Components exist in two locations:
- `apps/frontend-web/src/components/shared/` (OLD - DELETE)
- `apps/frontend-web/src/features/components/shared/` (NEW - KEEP)

## Solution Steps

### Step 1: Verify All Imports Use New Location

Check that all imports use `@/features/components/shared` or `@/components` (which maps to features):

```bash
# Search for old imports
cd apps/frontend-web
grep -r "from.*components/shared" src/ --exclude-dir=node_modules
grep -r "from.*\.\.\/\.\.\/components\/shared" src/ --exclude-dir=node_modules
```

### Step 2: Check for Direct Imports

```bash
# Check for direct file imports
grep -r "components/shared/NepaliDatePicker" src/
grep -r "components/shared/ConfirmModal" src/
grep -r "components/shared/RichTextEditor" src/
```

### Step 3: Delete Old Directory

Once verified, delete the old location:

```bash
# Windows PowerShell
Remove-Item -Recurse -Force apps/frontend-web/src/components/shared

# Or manually delete the folder
```

### Step 4: Verify Build

```bash
cd apps/frontend-web
pnpm build
# Should complete without errors
```

## Components to Verify

These components exist in both locations - ensure all imports use the NEW location:

- ✅ `NepaliCalendar`
- ✅ `NepaliDateDisplay`
- ✅ `NepaliDatePicker`
- ✅ `ConfirmModal`
- ✅ `RichTextEditor`

## Import Path Reference

**Correct imports (use these):**
```typescript
// Using path alias (recommended)
import { NepaliDatePicker } from '@/features/components/shared';
import { ConfirmModal } from '@/components'; // Maps to features/components/shared

// Direct import
import { NepaliDatePicker } from '@/features/components/shared/NepaliDatePicker';
```

**Wrong imports (should not exist):**
```typescript
// ❌ OLD - Don't use
import NepaliDatePicker from '@/components/shared/NepaliDatePicker';
import { NepaliDatePicker } from '../../components/shared';
```

## Verification Checklist

- [ ] No imports reference `components/shared/` (old location)
- [ ] All imports use `@/features/components/shared` or `@/components`
- [ ] TypeScript compilation succeeds
- [ ] Build succeeds
- [ ] Old directory deleted
