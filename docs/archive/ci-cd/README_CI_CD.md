# CI/CD Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Generate JWT_SECRET

```bash
# Run the secret generator
pnpm generate:secrets

# Or manually generate
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy the output** - you'll need it in the next step.

### Step 2: Add Secrets to GitHub

1. Go to: **Repository → Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Add these 3 secrets:

| Secret Name           | Value                            |
| --------------------- | -------------------------------- |
| `JWT_SECRET`          | (Paste from Step 1)              |
| `JWT_EXPIRES_IN`      | `7d`                             |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api` |

### Step 3: Test Workflows

```bash
git add .
git commit -m "ci: configure CI/CD pipeline"
git push
```

Then check the **Actions** tab in GitHub to see workflows run!

### Step 4: Set Branch Protection (Optional)

1. Go to **Settings → Branches**
2. Add rule for `main` branch
3. Require status checks: `lint`, `type-check`, `build`, `test-backend`, `test-frontend`

## 📚 Detailed Documentation

- **Complete Setup**: [.github/ACTION_REQUIRED.md](.github/ACTION_REQUIRED.md)
- **Secrets Guide**: [.github/SECRETS_SETUP.md](.github/SECRETS_SETUP.md)
- **Branch Protection**: [.github/BRANCH_PROTECTION_SETUP.md](.github/BRANCH_PROTECTION_SETUP.md)

## ✅ What's Configured

- ✅ CI pipeline (lint, type-check, build, tests)
- ✅ E2E tests with Playwright
- ✅ Security audits
- ✅ Dependency monitoring
- ✅ Deployment pipeline (ready to configure)

## 🎯 Next Steps

1. Add secrets (see Step 2 above)
2. Push changes to trigger workflows
3. Verify workflows pass
4. Configure deployment (optional)
