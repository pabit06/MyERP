# GitHub Actions Workflows

This directory contains CI/CD workflows for the MyERP project.

## Workflows

### 1. CI (`ci.yml`)

Runs on every push and pull request to `main`, `develop`, and `upgrade/**` branches.

**Jobs:**
- **Lint**: Runs ESLint on all code
- **Type Check**: Validates TypeScript types across all packages
- **Build**: Builds backend and frontend applications
- **Test Backend**: Runs backend unit tests with PostgreSQL service
- **Test Frontend**: Runs frontend unit tests
- **E2E Tests**: Runs end-to-end tests with full backend server

**Requirements:**
- PostgreSQL service (for backend and E2E tests)
- Environment variables configured in repository secrets

### 2. CD (`cd.yml`)

Runs on pushes to `main` branch and version tags (`v*`).

**Jobs:**
- **Deploy Backend**: Builds and packages backend for deployment
- **Deploy Frontend**: Builds and packages frontend for deployment

**Note:** Actual deployment steps need to be configured based on your infrastructure (Docker, Kubernetes, Vercel, etc.)

### 3. Security Audit (`security-audit.yml`)

Runs weekly and on every push/PR to check for security vulnerabilities.

**Features:**
- Runs `pnpm audit` to check for known vulnerabilities
- Fails if moderate or higher severity vulnerabilities are found
- Scheduled to run every Monday at 9 AM UTC

### 4. Dependency Update Check (`dependency-update.yml`)

Runs weekly to check for outdated dependencies.

**Features:**
- Checks for outdated packages using `pnpm outdated`
- Creates GitHub issue if updates are available
- Scheduled to run every Monday at 8 AM UTC

## Setup

### Required Secrets

Configure these secrets in your GitHub repository settings:

**For CI/CD:**
- `DATABASE_URL` - PostgreSQL connection string for tests
- `JWT_SECRET` - JWT secret key for tests
- `NEXT_PUBLIC_API_URL` - Frontend API URL (for builds)

**For Deployment (optional):**
- `BACKEND_URL` - Backend deployment URL
- `FRONTEND_URL` - Frontend deployment URL
- `HOST` - Server hostname (if deploying via SSH)
- `USERNAME` - SSH username
- `SSH_KEY` - SSH private key
- `VERCEL_TOKEN` - Vercel deployment token (if using Vercel)
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### Environment Variables

The workflows use environment variables for configuration. You can override them in GitHub Actions secrets or workflow files.

## Usage

### Running Workflows Manually

Some workflows can be triggered manually:

1. Go to the "Actions" tab in your GitHub repository
2. Select the workflow you want to run
3. Click "Run workflow"

### Viewing Results

- Go to the "Actions" tab to see workflow runs
- Click on a workflow run to see detailed logs
- E2E test reports are uploaded as artifacts

## Customization

### Adding New Jobs

To add a new job to CI:

```yaml
new-job:
  name: New Job
  runs-on: ubuntu-latest
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    # ... your steps
```

### Modifying Deployment

Edit `cd.yml` to add your deployment steps. Examples:

**Docker:**
```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v4
  with:
    context: ./apps/backend
    push: true
    tags: myerp/backend:latest
```

**Kubernetes:**
```yaml
- name: Deploy to Kubernetes
  uses: azure/k8s-deploy@v4
  with:
    manifests: k8s/
    images: myerp/backend:latest
```

**Vercel:**
```yaml
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v20
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## Troubleshooting

### Tests Failing

- Check database connection string
- Verify environment variables are set
- Check test data setup

### Build Failing

- Verify all dependencies are installed
- Check for TypeScript errors
- Ensure build scripts are correct

### Deployment Failing

- Verify deployment secrets are configured
- Check deployment target is accessible
- Review deployment logs for errors

## Best Practices

1. **Keep workflows fast**: Use caching and parallel jobs
2. **Fail fast**: Run quick checks (lint, type-check) first
3. **Use matrix builds**: Test against multiple Node.js versions if needed
4. **Secure secrets**: Never commit secrets to repository
5. **Review PRs**: Require CI to pass before merging
6. **Monitor regularly**: Check workflow runs for issues
