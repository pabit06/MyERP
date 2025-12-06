# 🚀 START HERE: CI/CD Setup

## Quick Setup (5 minutes)

### 1️⃣ Generate JWT_SECRET

Run this command:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy the output** - it will look like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`

### 2️⃣ Add Secrets to GitHub

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click **"New repository secret"**
3. Add these 3 secrets:

   **Secret 1:**
   - Name: `JWT_SECRET`
   - Value: (paste the value from step 1)
   - Click "Add secret"

   **Secret 2:**
   - Name: `JWT_EXPIRES_IN`
   - Value: `7d`
   - Click "Add secret"

   **Secret 3:**
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://api.yourdomain.com/api` (update with your URL)
   - Click "Add secret"

### 3️⃣ Test Workflows

Run these commands:

```bash
git add .
git commit -m "ci: configure CI/CD pipeline and workflows"
git push
```

Then:
1. Go to the **Actions** tab in GitHub
2. Watch workflows run
3. Wait 5-10 minutes
4. Verify all jobs pass ✅

### 4️⃣ Set Branch Protection (Optional)

1. Go to **Settings → Branches**
2. Click **"Add rule"**
3. Branch: `main`
4. Enable:
   - ✅ Require pull request
   - ✅ Require status checks: `lint`, `type-check`, `build`, `test-backend`, `test-frontend`
   - ✅ Require branches up to date
5. Click **"Create"**

## ✅ Done!

Your CI/CD pipeline is now active!

## 📚 More Help

- **Detailed Guide**: [.github/ACTION_REQUIRED.md](../../.github/ACTION_REQUIRED.md)
- **Secrets Setup**: [.github/SECRETS_SETUP.md](../../.github/SECRETS_SETUP.md)
- **Branch Protection**: [.github/BRANCH_PROTECTION_SETUP.md](../../.github/BRANCH_PROTECTION_SETUP.md)
