# Root Directory Management Guide

## ✅ Clean Root Directory Standards

The root directory should only contain essential project files:

### ✅ Allowed Files in Root

1. **Configuration Files**
   - `package.json` - Monorepo package configuration
   - `pnpm-workspace.yaml` - pnpm workspace configuration
   - `pnpm-lock.yaml` - Dependency lock file
   - `tsconfig.json` - TypeScript root configuration

2. **Documentation**
   - `README.md` - Main project README (ONLY markdown file allowed in root)

3. **Scripts Directory**
   - `scripts/` - Project-wide scripts

### ❌ Files NOT Allowed in Root

- ❌ Any other `.md` files (move to `docs/`)
- ❌ Temporary files
- ❌ Git command outputs
- ❌ Test files
- ❌ Build artifacts
- ❌ Log files

## 📁 Directory Structure

```
MyERP/
├── README.md              ✅ Main README (only .md in root)
├── package.json           ✅ Root package config
├── pnpm-workspace.yaml    ✅ Workspace config
├── pnpm-lock.yaml         ✅ Lock file
├── tsconfig.json          ✅ TS config
│
├── apps/                  ✅ Applications
│   ├── backend/
│   ├── frontend-web/
│   └── mobile-member/
│
├── packages/              ✅ Shared packages
│   ├── db-schema/
│   └── shared-types/
│
├── docs/                  ✅ All documentation
│   ├── setup/
│   ├── implementation/
│   ├── migration/
│   ├── rbac/
│   ├── testing/
│   ├── project/
│   ├── planning/
│   └── reference/
│
└── scripts/               ✅ Project scripts
    ├── setup-aml.ps1
    └── setup-aml.sh
```

## 🧹 Cleanup Checklist

When checking root directory cleanliness:

- [ ] Only `README.md` is in root (no other .md files)
- [ ] No temporary files
- [ ] No git command outputs
- [ ] No duplicate directories (e.g., `apps/docs/` should not exist)
- [ ] Only essential config files
- [ ] All documentation in `docs/` subdirectories

## 📝 Maintenance

1. **Regular Checks**: Periodically check root for stray files
2. **Move Documentation**: Any new .md files should go to `docs/`
3. **Clean Temporary Files**: Remove any temporary or accidental files
4. **Verify Structure**: Ensure no duplicate or misplaced directories

## 🎯 Benefits

- ✅ Professional project structure
- ✅ Easy to navigate
- ✅ Clear separation of concerns
- ✅ Scalable organization

