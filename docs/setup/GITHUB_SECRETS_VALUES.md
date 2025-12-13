# GitHub Secrets - Generated Values

**⚠️ IMPORTANT:** Copy these values to GitHub Repository Settings → Secrets and variables → Actions

## Required Secrets

### 1. JWT_SECRET

**Generate a new one by running:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Or use the script:**

```bash
pnpm generate:secrets
```

**Value Format:** 64-character hexadecimal string

**Example:**

```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 2. JWT_EXPIRES_IN

**Value:**

```
7d
```

### 3. NEXT_PUBLIC_API_URL

**Value (Development):**

```
http://localhost:4000/api
```

**Value (Production):**

```
https://api.yourdomain.com/api
```

**⚠️ Update with your actual backend API URL**

## How to Add to GitHub

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click **"New repository secret"**
3. For each secret:
   - Enter the **Name** (exactly as shown above)
   - Enter the **Value**
   - Click **"Add secret"**

## Verification

After adding secrets, you should see:

- ✅ JWT_SECRET
- ✅ JWT_EXPIRES_IN
- ✅ NEXT_PUBLIC_API_URL

In: Settings → Secrets and variables → Actions

## Next Step

After adding secrets, push a change to trigger workflows:

```bash
git add .
git commit -m "ci: configure CI/CD pipeline"
git push
```

Then check the Actions tab to see workflows run!
