# CI/CD Quick Start Guide

Get your CI/CD pipeline up and running in 5 minutes!

## Step 1: Configure GitHub Secrets (2 minutes)

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these **required** secrets:

| Secret Name | Value | How to Generate |
|------------|-------|----------------|
| `JWT_SECRET` | Random 32+ character string | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `7d` | - |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api` | Your backend API URL |

**Quick Copy-Paste:**
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

See [SECRETS_SETUP.md](./SECRETS_SETUP.md) for complete list.

## Step 2: Test Workflows (1 minute)

1. Make a small change (e.g., update this file)
2. Commit and push:
   ```bash
   git add .
   git commit -m "test: trigger CI workflows"
   git push
   ```
3. Go to **Actions** tab in GitHub
4. Watch workflows run! 🎉

## Step 3: Set Branch Protection (2 minutes)

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Branch name: `main`
4. Enable:
   - ✅ Require pull request before merging
   - ✅ Require status checks to pass
   - ✅ Select: `lint`, `type-check`, `build`, `test-backend`, `test-frontend`
   - ✅ Require branches to be up to date
5. Click **Create**

See [BRANCH_PROTECTION_SETUP.md](./BRANCH_PROTECTION_SETUP.md) for details.

## Step 4: Configure Deployment (Optional)

Edit `.github/workflows/cd.yml` and uncomment the deployment method you use:

- **Vercel**: Uncomment Vercel deployment section
- **SSH**: Uncomment SSH deployment section
- **Docker**: Uncomment Docker deployment section
- **AWS**: Uncomment AWS deployment section

Add required secrets for your deployment method.

## ✅ Done!

Your CI/CD pipeline is now:
- ✅ Running tests on every push/PR
- ✅ Building applications
- ✅ Checking for security issues
- ✅ Ready for deployment (when configured)

## Next Steps

- [ ] Review workflow runs in Actions tab
- [ ] Configure deployment steps
- [ ] Set up branch protection
- [ ] Monitor workflow performance

## Need Help?

- **Secrets**: See [SECRETS_SETUP.md](./SECRETS_SETUP.md)
- **Branch Protection**: See [BRANCH_PROTECTION_SETUP.md](./BRANCH_PROTECTION_SETUP.md)
- **Full Setup**: See [../docs/ci-cd/CICD_SETUP.md](../docs/ci-cd/CICD_SETUP.md)
- **Workflow Details**: See [workflows/README.md](./workflows/README.md)
