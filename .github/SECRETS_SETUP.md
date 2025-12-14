# GitHub Secrets Configuration Guide

This guide will help you configure all required secrets for the CI/CD pipeline.

## How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

## Required Secrets for CI

These secrets are required for the CI workflows to run successfully.

### 1. DATABASE_URL (For CI Tests)

**Purpose:** PostgreSQL connection string for running tests

**Value:**

```
postgresql://postgres:postgres@localhost:5432/myerp_test
```

**Note:** This is only used in CI. The workflow uses a service container, so this is mainly for reference. The actual test database is provided by the GitHub Actions service container.

### 2. JWT_SECRET (For CI Tests)

**Purpose:** JWT secret key for authentication in tests

**Value:** Generate a secure random string (at least 32 characters)

**Generate:**

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

**Example:**

```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### 3. JWT_EXPIRES_IN (For CI Tests)

**Purpose:** JWT token expiration time

**Value:**

```
7d
```

### 4. NEXT_PUBLIC_API_URL (For Frontend Builds)

**Purpose:** Backend API URL for frontend builds

**Value (Development/Staging):**

```
http://localhost:4000/api
```

**Value (Production):**

```
https://api.yourdomain.com/api
```

## Optional Secrets for CD (Deployment)

These secrets are only needed if you want to deploy automatically.

### 5. BACKEND_URL

**Purpose:** Backend deployment URL (for environment configuration)

**Value:**

```
https://api.yourdomain.com
```

### 6. FRONTEND_URL

**Purpose:** Frontend deployment URL (for environment configuration)

**Value:**

```
https://yourdomain.com
```

## Deployment-Specific Secrets

Choose the secrets based on your deployment method:

### For SSH Deployment

#### 7. HOST

**Purpose:** Server hostname or IP address

**Value:**

```
your-server.com
```

or

```
192.168.1.100
```

#### 8. USERNAME

**Purpose:** SSH username for deployment

**Value:**

```
deploy
```

or

```
ubuntu
```

#### 9. SSH_KEY

**Purpose:** SSH private key for authentication

**How to generate:**

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Copy the private key content
cat ~/.ssh/github_actions
```

**Value:** Paste the entire private key (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

**Important:**

- Never commit this key to the repository
- Add the public key to your server's `~/.ssh/authorized_keys`

### For Vercel Deployment

#### 10. VERCEL_TOKEN

**Purpose:** Vercel API token

**How to get:**

1. Go to https://vercel.com/account/tokens
2. Create a new token
3. Copy the token

**Value:** Your Vercel token

#### 11. VERCEL_ORG_ID

**Purpose:** Vercel organization ID

**How to get:**

1. Go to your Vercel team settings
2. Copy the Organization ID

**Value:** Your organization ID

#### 12. VERCEL_PROJECT_ID

**Purpose:** Vercel project ID

**How to get:**

1. Go to your project settings in Vercel
2. Copy the Project ID

**Value:** Your project ID

### For Docker Hub Deployment

#### 13. DOCKER_USERNAME

**Purpose:** Docker Hub username

**Value:** Your Docker Hub username

#### 14. DOCKER_PASSWORD

**Purpose:** Docker Hub password or access token

**Value:** Your Docker Hub password or access token

### For AWS Deployment

#### 15. AWS_ACCESS_KEY_ID

**Purpose:** AWS access key ID

**Value:** Your AWS access key

#### 16. AWS_SECRET_ACCESS_KEY

**Purpose:** AWS secret access key

**Value:** Your AWS secret key

#### 17. AWS_REGION

**Purpose:** AWS region

**Value:**

```
us-east-1
```

### For Production Database

#### 18. PROD_DATABASE_URL

**Purpose:** Production database connection string

**Value:**

```
postgresql://user:password@prod-db-host:5432/myerp_prod
```

**Security:** Use a read-only user for migrations if possible, or a user with limited permissions.

## Environment-Specific Secrets

You can create different secrets for different environments:

### Staging Environment

Create secrets with `_STAGING` suffix:

- `DATABASE_URL_STAGING`
- `JWT_SECRET_STAGING`
- etc.

### Production Environment

Create secrets with `_PROD` suffix:

- `DATABASE_URL_PROD`
- `JWT_SECRET_PROD`
- etc.

Then reference them in workflows using:

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL_PROD }}
```

## Quick Setup Script

You can use this script to generate secure secrets:

```bash
#!/bin/bash
# generate-secrets.sh

echo "=== GitHub Secrets Generator ==="
echo ""
echo "JWT_SECRET:"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
echo ""
echo "Copy these values to GitHub Secrets:"
echo ""
echo "Required for CI:"
echo "  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myerp_test"
echo "  JWT_SECRET=<generated above>"
echo "  JWT_EXPIRES_IN=7d"
echo "  NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api"
```

## Verification

After adding secrets, verify they're set:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. You should see all your secrets listed
3. Secrets are masked in workflow logs (shown as `***`)

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Use different secrets** for different environments
3. **Rotate secrets regularly** (especially JWT_SECRET)
4. **Use least privilege** - only grant necessary permissions
5. **Review secret access** regularly
6. **Use environment-specific secrets** for production

## Troubleshooting

### Secret Not Found Error

If you see `Secret not found` errors:

- Verify the secret name matches exactly (case-sensitive)
- Check that the secret is added to the repository
- Ensure you're using the correct secret name in workflows

### Secret Value Issues

If workflows fail with configuration errors:

- Verify secret values are correct
- Check for extra spaces or newlines
- Ensure URLs are properly formatted
- Verify connection strings are valid

## Example: Complete Setup

Here's a complete example of all secrets you might need:

```
# Required for CI
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myerp_test
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api

# Deployment URLs
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# SSH Deployment
HOST=your-server.com
USERNAME=deploy
SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----

# Or Vercel Deployment
VERCEL_TOKEN=vercel_xxxxx
VERCEL_ORG_ID=team_xxxxx
VERCEL_PROJECT_ID=prj_xxxxx
```

## Next Steps

After configuring secrets:

1. ✅ Test workflows by pushing a change
2. ✅ Verify all jobs pass
3. ✅ Configure deployment steps in `cd.yml`
4. ✅ Set up branch protection rules
