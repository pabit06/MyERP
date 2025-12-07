# Frontend Feature-Based Migration Status

## Completed ✅

1. **Public Folder Organization**
   - Created structure: `public/images/logos`, `public/images/icons`, `public/images/placeholders`, `public/favicons`, `public/documents`

2. **Shared Components Migration**
   - Moved to `features/components/shared/`:
     - Layout.tsx
     - Header.tsx
     - Sidebar.tsx
     - Navigation.tsx
     - ProtectedRoute.tsx
     - MyERPLogo.tsx
     - All shared components (NepaliCalendar, NepaliDatePicker, etc.)
     - All UI components (button, card, input, etc.)
   - Created barrel export: `features/components/shared/index.ts`
   - Fixed imports in moved shared components

3. **Member Components**
   - Directory structure created: `features/members/components/`
   - Components to move:
     - MemberWorkflow.tsx
     - SourceOfFundsModal.tsx
     - KYMInstitutionForm.tsx

## Remaining Work 🔄

### 1. Update All Import Paths

The following files need their imports updated to use the new feature-based structure:

#### Shared Components Imports
Replace all instances of:
- `from '../../components/ProtectedRoute'` → `from '@/features/components/shared'` or `from '../../../features/components/shared'`
- `from '../../components/NepaliDatePicker'` → `from '@/features/components/shared'`
- `from '@/components/ui/button'` → `from '@/features/components/shared'`
- `from '@/components/NepaliDatePicker'` → `from '@/features/components/shared'`

#### Member Components Imports
- `from '../../../components/MemberWorkflow'` → `from '@/features/members/components/MemberWorkflow'` or use barrel export
- `from '../../../../components/KymForm'` → `from '@/features/members'` (if using barrel export)

#### Chart Components
Charts are already in `features/dashboard/components/` but pages still import from old location:
- `from '../../components/charts/MemberGrowthChart'` → `from '@/features/dashboard/components/MemberGrowthChart'` or use barrel export

### 2. Files Requiring Import Updates

**High Priority (Core Layout):**
- ✅ `app/layout.tsx` - Updated to use `features/components/shared`

**Pages (78+ files need updates):**
- All files in `app/` directory that import from `components/`
- Key files:
  - `app/dashboard/page.tsx`
  - `app/members/page.tsx`
  - `app/members/[id]/page.tsx`
  - `app/savings/page.tsx`
  - `app/general-ledger/**/*.tsx`
  - `app/governance/**/*.tsx`
  - `app/compliance/**/*.tsx`
  - `app/hrm/**/*.tsx`
  - `app/reports/**/*.tsx`
  - `app/shares/**/*.tsx`
  - `app/documents/**/*.tsx`

**Feature Components:**
- Files in `features/members/components/` that import UI components
- Files in `features/savings/components/` that import shared components
- Files in `features/documents/components/` that import shared components

### 3. Path Alias Configuration

Ensure `tsconfig.json` has path aliases:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/components/*": ["./src/features/components/shared/*"]
    }
  }
}
```

### 4. Barrel Exports

Create/update barrel exports for easier imports:
- ✅ `features/components/shared/index.ts` - Created
- `features/members/index.ts` - Update to export components
- `features/dashboard/index.ts` - Already exists, verify exports
- `features/savings/index.ts` - Already exists, verify exports
- `features/documents/index.ts` - Already exists, verify exports

### 5. Cleanup

After migration:
- Remove old `components/` directory (or keep as deprecated for reference)
- Update any remaining references
- Run linter to catch any missed imports

## Migration Strategy

### Option 1: Systematic File-by-File Update
1. Update imports in `app/` directory files first (highest impact)
2. Then update feature-specific components
3. Test after each major section

### Option 2: Find & Replace (Faster but riskier)
Use IDE find & replace with regex:
- Find: `from ['"]\.\.\/.*components\/(.*)['"]`
- Replace with appropriate new paths

### Option 3: Use Path Aliases
Update all imports to use `@/features/...` aliases for consistency

## Testing Checklist

After migration:
- [ ] All pages load without import errors
- [ ] Shared components render correctly
- [ ] Member workflow works
- [ ] Charts display properly
- [ ] Forms submit correctly
- [ ] No console errors
- [ ] TypeScript compilation succeeds
- [ ] Linter passes

## Notes

- The migration maintains backward compatibility by keeping old files until all imports are updated
- Some components may need additional path adjustments based on their location
- Consider using barrel exports (`index.ts`) for cleaner imports

