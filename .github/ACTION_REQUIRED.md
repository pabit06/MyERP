# ⚠️ ACTION REQUIRED: Complete CI/CD Setup

## Step-by-Step Instructions

Follow these steps to complete your CI/CD setup. This will take about 5-10 minutes.

---

## Step 1: Generate JWT_SECRET (1 minute)

Run this command in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy the output** - you'll need it in the next step.

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

## Step 2: Add Secrets to GitHub (3 minutes)

### 2.1 Navigate to Secrets

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **"New repository secret"** button

### 2.2 Add JWT_SECRET

1. **Name:** `JWT_SECRET`
2. **Secret:** Paste the value from Step 1
3. Click **"Add secret"**

### 2.3 Add JWT_EXPIRES_IN

1. Click **"New repository secret"** again
2. **Name:** `JWT_EXPIRES_IN`
3. **Secret:** `7d`
4. Click **"Add secret"**

### 2.4 Add NEXT_PUBLIC_API_URL

1. Click **"New repository secret"** again
2. **Name:** `NEXT_PUBLIC_API_URL`
3. **Secret:** `https://api.yourdomain.com/api` (update with your actual URL)
4. Click **"Add secret"**

### Verification

You should now see 3 secrets listed:
- ✅ JWT_SECRET
- ✅ JWT_EXPIRES_IN
- ✅ NEXT_PUBLIC_API_URL

---

## Step 3: Test Workflows (2 minutes)

### 3.1 Commit and Push

Run these commands:

```bash
# Add all changes
git add .

# Commit
git commit -m "ci: configure CI/CD pipeline and workflows"

# Push to trigger workflows
git push
```

### 3.2 Verify Workflows Run

1. Go to the **Actions** tab in GitHub
2. You should see workflows running
3. Wait 5-10 minutes for them to complete
4. Check that all jobs show ✅ (green checkmark)

**Expected workflows:**
- ✅ CI (with jobs: lint, type-check, build, test-backend, test-frontend, e2e-tests)
- ✅ Security Audit
- ✅ Dependency Update Check

---

## Step 4: Set Branch Protection (3 minutes)

### 4.1 Navigate to Branch Protection

1. Go to **Settings** → **Branches**
2. Click **"Add rule"** or **"Add branch protection rule"**

### 4.2 Configure Rule

**Branch name pattern:** `main`

**Enable these settings:**

✅ **Require a pull request before merging**
- Require approvals: **1**

✅ **Require status checks to pass before merging**
- ✅ Require branches to be up to date before merging
- Select these checks (they'll appear after workflows run):
  - `lint`
  - `type-check`
  - `build`
  - `test-backend`
  - `test-frontend`

✅ **Require conversation resolution before merging**

✅ **Do not allow bypassing the above settings**

❌ **Allow force pushes** (leave unchecked)

❌ **Allow deletions** (leave unchecked)

✅ **Include administrators**

### 4.3 Save

Click **"Create"** or **"Save changes"**

**Note:** Status checks will only appear after workflows have run at least once. If you don't see them, complete Step 3 first, then come back to this step.

---

## Step 5: Verify Everything Works

### Test with a Pull Request

1. Create a test branch:
   ```bash
   git checkout -b test/ci-verification
   ```

2. Make a small change:
   ```bash
   echo "# Test" >> README.md
   git add README.md
   git commit -m "test: verify CI workflow"
   git push origin test/ci-verification
   ```

3. Open a Pull Request on GitHub

4. Verify:
   - ✅ Status checks appear on the PR
   - ✅ All checks must pass before merging
   - ✅ PR requires approval
   - ✅ Cannot merge if checks fail

---

## Troubleshooting

### Secrets Not Found

**Error:** Workflow fails with "Secret not found"

**Solution:**
- Verify secret names match exactly (case-sensitive: `JWT_SECRET` not `jwt_secret`)
- Check that secrets are in: Settings → Secrets and variables → Actions
- Ensure you're using the correct repository

### Status Checks Not Appearing

**Problem:** Can't select status checks in branch protection

**Solution:**
1. Complete Step 3 first (push and let workflows run)
2. Wait for workflows to complete
3. Refresh the branch protection settings page
4. Status checks should now appear

### Workflows Not Running

**Problem:** No workflows appear in Actions tab

**Solution:**
- Verify workflow files are in `.github/workflows/`
- Check that you pushed the changes
- Verify repository has Actions enabled (Settings → Actions → General)

### Tests Failing

**Problem:** Tests fail in CI

**Solution:**
- Check workflow logs for specific errors
- Verify secrets are set correctly
- Ensure database migrations run successfully
- Review test setup in workflow files

---

## Quick Reference

### Generate JWT_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Test Workflows
```bash
git commit --allow-empty -m "test: trigger CI"
git push
```

### View Workflows
- GitHub → Actions tab
- See all runs and their status

### Required Secrets Checklist
- [ ] `JWT_SECRET` - 64-char hex string
- [ ] `JWT_EXPIRES_IN` - `7d`
- [ ] `NEXT_PUBLIC_API_URL` - Your API URL

---

## Support

- **Quick Start**: [.github/QUICK_START.md](.github/QUICK_START.md)
- **Secrets Guide**: [.github/SECRETS_SETUP.md](.github/SECRETS_SETUP.md)
- **Branch Protection**: [.github/BRANCH_PROTECTION_SETUP.md](.github/BRANCH_PROTECTION_SETUP.md)
- **Full Documentation**: [CICD_SETUP.md](../docs/ci-cd/CICD_SETUP.md)

---

## ✅ Completion Checklist

- [ ] JWT_SECRET generated and added to GitHub
- [ ] JWT_EXPIRES_IN added to GitHub
- [ ] NEXT_PUBLIC_API_URL added to GitHub
- [ ] Changes pushed to GitHub
- [ ] Workflows run successfully
- [ ] All CI jobs pass
- [ ] Branch protection rules configured
- [ ] Test PR created and verified

**Once all items are checked, your CI/CD pipeline is fully operational!** 🎉
