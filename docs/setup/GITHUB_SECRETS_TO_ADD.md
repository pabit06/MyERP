# GitHub Secrets to Add

## Repository: https://github.com/pabit06/MyERP

## Step 1: Generate JWT_SECRET

Run this command in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy the output** - it will be a 64-character hexadecimal string.

## Step 2: Add Secrets to GitHub

1. **Go to:** https://github.com/pabit06/MyERP/settings/secrets/actions
2. **Click:** "New repository secret" button
3. **Add these 3 secrets:**

### Secret 1: JWT_SECRET
- **Name:** `JWT_SECRET`
- **Value:** (Paste the value from Step 1)
- Click "Add secret"

### Secret 2: JWT_EXPIRES_IN
- **Name:** `JWT_EXPIRES_IN`
- **Value:** `7d`
- Click "Add secret"

### Secret 3: NEXT_PUBLIC_API_URL
- **Name:** `NEXT_PUBLIC_API_URL`
- **Value:** `https://api.yourdomain.com/api` (update with your actual API URL)
- Click "Add secret"

## Step 3: Verify

After adding all secrets, you should see:
- ✅ JWT_SECRET
- ✅ JWT_EXPIRES_IN
- ✅ NEXT_PUBLIC_API_URL

In the secrets list.

## Step 4: Test Workflows

After adding secrets, push a change to trigger workflows:

```bash
git add .
git commit -m "ci: configure CI/CD pipeline"
git push
```

Then check the **Actions** tab to see workflows run!
