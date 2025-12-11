# ESLint v9 Migration Plan

## Current Status

- **Current ESLint Version**: v8.57.1
- **Latest ESLint Version**: v9.39.1
- **Migration Required**: Yes (major version update)

## Outdated Packages

The following packages have major version updates available:

1. **eslint**: 8.57.1 → 9.39.1 (MAJOR - breaking changes)
2. **eslint-config-prettier**: 9.1.2 → 10.1.8 (MAJOR - breaking changes)

## Why Not Update Now?

ESLint v9 introduces significant breaking changes:

- New flat config format (replaces `.eslintrc.json`)
- Changes to plugin system
- Updated rule configurations
- Requires migration of all ESLint config files

## Migration Steps (When Ready)

### 1. Update Dependencies

```bash
pnpm update eslint@latest eslint-config-prettier@latest
pnpm update @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest
```

### 2. Migrate ESLint Configuration

ESLint v9 uses a new flat config format. Current `.eslintrc.json` needs to be converted to `eslint.config.js`:

**Current** (`.eslintrc.json`):

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"]
}
```

**New** (`eslint.config.js`):

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended);
```

### 3. Update All Workspace Configs

- Root `.eslintrc.json`
- `apps/backend/.eslintrc.json` (if exists)
- `apps/frontend-web/.eslintrc.json` (if exists)
- `apps/mobile-member/.eslintrc.json` (if exists)

### 4. Test and Fix

- Run `pnpm lint` to check for issues
- Fix any breaking changes
- Update CI/CD workflows if needed

## Resources

- [ESLint v9 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
- [Flat Config Documentation](https://eslint.org/docs/latest/use/configure/configuration-files-new)
- [TypeScript ESLint v9 Support](https://typescript-eslint.io/getting-started)

## Timeline

- **Status**: Not started
- **Priority**: Medium (ESLint v8 is still supported)
- **Estimated Effort**: 2-4 hours
- **Risk**: Medium (requires testing all linting rules)

## Notes

- ESLint v8 is still supported and maintained
- Migration can be done when convenient
- No security vulnerabilities in current version
- `pnpm outdated` will continue to show these until migration is complete
