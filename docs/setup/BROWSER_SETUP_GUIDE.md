# Browser Setup Guide for GitHub Secrets

I can help you add secrets to GitHub using the browser! Here's what we need:

## Step 1: Provide Your Repository URL

Please provide your GitHub repository URL in this format:

```
https://github.com/YOUR_USERNAME/YOUR_REPO_NAME
```

For example:

```
https://github.com/johndoe/myerp
```

## Step 2: Sign In to GitHub

If you're not already signed in:

1. The browser is currently on the GitHub login page
2. Sign in with your credentials
3. Once signed in, I can navigate to your repository

## Step 3: I'll Help You Add Secrets

Once you provide the repository URL and you're signed in, I will:

1. Navigate to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Generate a secure JWT_SECRET
3. Guide you through adding each secret:
   - JWT_SECRET
   - JWT_EXPIRES_IN (value: `7d`)
   - NEXT_PUBLIC_API_URL (your API URL)

## Quick Alternative

If you prefer to do it manually:

1. Generate JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Go to: Repository → Settings → Secrets and variables → Actions
3. Add the 3 secrets as described above

---

**Please provide your GitHub repository URL to continue!**
