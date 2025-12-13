# Next Actions - Prioritized Task List

## 🚀 Immediate Actions (Do First)

### 1. Complete Documentation Organization ⏱️ 5 minutes

**Status:** Structure created, files need to be moved

**Action:**

```powershell
# Run the organization script
cd e:\MyERP
.\docs\organize-docs.ps1
```

**Or manually move files:**

- Move status files → `docs/status/`
- Move setup files → `docs/setup/`
- Move roadmap files → `docs/roadmap/`
- Move assessment files → `docs/assessment/`

**Verify:**

- Root should only have `README.md`, `START_HERE.md`, and config files
- All docs organized in `docs/` subdirectories

---

### 2. Fix Duplicate Components ⏱️ 5 minutes

**Status:** Critical issue - components exist in two locations

**Problem:**

- `apps/frontend-web/src/components/shared/` (OLD - DELETE)
- `apps/frontend-web/src/features/components/shared/` (NEW - KEEP)

**Action:**

```powershell
# 1. Verify all imports use new location
cd apps/frontend-web
# Search for old imports (should find none)
grep -r "from.*components/shared" src/ --exclude-dir=node_modules

# 2. Delete old directory
Remove-Item -Recurse -Force src/components/shared

# 3. Verify build
pnpm build
```

**Reference:** See `docs/assessment/QUICK_FIX_DUPLICATE_COMPONENTS.md`

---

### 3. Update .gitignore for Secrets ⏱️ 2 minutes

**Status:** Secret files should not be committed

**Action:**
Add to `.gitignore`:

```
# Secrets and sensitive files
docs/setup/*.txt
docs/setup/GENERATED_SECRETS.txt
docs/setup/JWT_SECRET*.txt
*.secret
*.key
```

---

## 📋 Short-term Improvements (This Week)

### 4. Complete Frontend Feature Migration

**Status:** Partially complete

**Action Items:**

- [ ] Move remaining components from `components/` to `features/`
- [ ] Update all import paths
- [ ] Remove old component directories
- [ ] Verify TypeScript compilation

**Reference:** See `docs/assessment/FOLDER_STRUCTURE_ASSESSMENT.md`

---

### 5. Clean Up Root Directory

**Status:** Some files may remain

**Action:**

- Remove any remaining markdown files from root (except README.md, START_HERE.md)
- Move to appropriate `docs/` subdirectory

---

### 6. Review and Update Documentation

**Status:** Structure created, content may need updates

**Action:**

- Review `docs/README.md` - ensure all links work
- Update any broken references
- Add missing documentation

---

## 🔧 Medium-term Enhancements (Next Sprint)

### 7. Backend Repository Pattern (Optional)

**Status:** Current structure is good, but could be enhanced

**Consider:**

- Implement repository pattern for better testability
- Separate data access from business logic

**Reference:** See `docs/assessment/FOLDER_STRUCTURE_ASSESSMENT.md` section 4

---

### 8. Add Linting Rules

**Status:** Prevent future issues

**Action:**

- Add ESLint rules to prevent imports from old locations
- Enforce path alias usage
- Add pre-commit hooks

---

### 9. Documentation Standards

**Status:** Create guidelines

**Action:**

- Create documentation template
- Define where different types of docs should go
- Add to contributing guide

---

## 📊 Quick Status Check

Run this to see current state:

```powershell
# Check root directory
Get-ChildItem -File -Filter "*.md" | Where-Object { $_.Name -notmatch "README|START_HERE" } | Select-Object Name

# Check if duplicate components exist
Test-Path "apps/frontend-web/src/components/shared"

# Check documentation structure
Get-ChildItem -Directory docs\ | Select-Object Name
```

---

## ✅ Completion Checklist

- [ ] Documentation files moved to `docs/` subdirectories
- [ ] Duplicate components removed
- [ ] `.gitignore` updated for secrets
- [ ] Root directory clean (only README.md, START_HERE.md, config files)
- [ ] Build passes after component cleanup
- [ ] All documentation links verified

---

## 🎯 Priority Order

1. **Fix Duplicate Components** (5 min) - Prevents confusion and bugs
2. **Complete Documentation Organization** (5 min) - Clean root directory
3. **Update .gitignore** (2 min) - Security
4. **Verify Everything Works** (5 min) - Run builds, check imports

**Total time: ~15-20 minutes for critical fixes**

---

## 📚 Reference Documents

- **Structure Assessment:** `docs/assessment/FOLDER_STRUCTURE_ASSESSMENT.md`
- **Quick Fix Guide:** `docs/assessment/QUICK_FIX_DUPLICATE_COMPONENTS.md`
- **Project Improvements:** `docs/roadmap/PROJECT_IMPROVEMENTS.md`
- **Next Steps:** `docs/roadmap/NEXT_STEPS_ROADMAP.md`

---

## 🆘 Need Help?

If you encounter issues:

1. Check the assessment documents in `docs/assessment/`
2. Review the quick fix guides
3. Verify file paths and imports
