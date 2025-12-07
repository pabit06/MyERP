# GitHub Secrets Quick Reference

## Required Secrets (Minimum)

Add these 3 secrets to get CI working:

### 1. JWT_SECRET

**Generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Or use the script:**
```bash
pnpm generate:secrets
```

**Value:** 64-character hexadecimal string (minimum 32 characters)

### 2. JWT_EXPIRES_IN

**Value:** `7d`

### 3. NEXT_PUBLIC_API_URL

**Value:** `https://api.yourdomain.com/api`

**Note:** Update with your actual backend API URL

## How to Add Secrets

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click **"New repository secret"**
3. Enter name and value
4. Click **"Add secret"**

## Quick Setup Commands

```bash
# Generate secrets
pnpm generate:secrets

# Or manually generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Verification

After adding secrets, verify:
- [ ] Secrets appear in Settings → Secrets and variables → Actions
- [ ] Secret names match exactly (case-sensitive)
- [ ] Values are correct (no extra spaces)

## Testing

After adding secrets:
1. Push a change to trigger workflows
2. Check Actions tab
3. Verify workflows run successfully
