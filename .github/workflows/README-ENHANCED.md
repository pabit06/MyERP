# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the MyERP project.

## 📋 Available Workflows

### 1. **CI Enhanced** (`ci-enhanced.yml`)

**Triggers:** Push to main/develop/feature/fix branches, Pull Requests

Comprehensive continuous integration pipeline that includes:

- ✅ **Linting** - Code style and quality checks
- ✅ **Type Checking** - TypeScript validation
- ✅ **Integration Tests** - NEW! Tests for AuthController, LoansController, AccountingController
- ✅ **Unit Tests** - Backend unit tests with PostgreSQL
- ✅ **Build Verification** - Ensures all packages build successfully
- ✅ **Test Summary** - Aggregated test results

**Key Features:**

- Parallel execution for faster feedback
- Caching for dependencies and build artifacts
- Separate integration and unit test jobs
- Automatic test result uploads

### 2. **CD Enhanced** (`cd-enhanced.yml`)

**Triggers:** Push to main, Version tags (v*.*.\*), Manual dispatch

Automated deployment pipeline:

- 🐳 **Docker Build & Push** - Multi-service container builds
- 🚀 **Staging Deployment** - Automatic deployment to staging
- 🎯 **Production Deployment** - Tag-based production releases
- 🧪 **Smoke Tests** - Post-deployment validation
- 📢 **Notifications** - Deployment status updates

**Environments:**

- `staging` - Auto-deploy from main branch
- `production` - Deploy from version tags or manual trigger

### 3. **Security Enhanced** (`security-enhanced.yml`)

**Triggers:** Daily at 2 AM UTC, Push to main, Pull Requests

Security and compliance checks:

- 🔒 **Security Audit** - npm/pnpm vulnerability scanning
- 🔍 **CodeQL Analysis** - Advanced code security analysis
- 📜 **License Compliance** - Open source license validation
- 📊 **Dependency Review** - PR dependency change analysis
- 📈 **Security Reports** - Automated security summaries

### 4. **Original CI** (`ci.yml`)

The existing comprehensive CI workflow with E2E tests using Playwright.

### 5. **Original CD** (`cd.yml`)

The existing deployment workflow.

## 🚀 Quick Start

### Running Workflows Locally

#### Test Integration Tests Locally:

```bash
# Run all integration tests
pnpm --filter backend exec vitest run tests/integration/

# Run specific test file
pnpm --filter backend exec vitest run tests/integration/auth.test.ts

# Run with coverage
pnpm --filter backend exec vitest run tests/integration/ --coverage
```

#### Simulate CI Environment:

```bash
# Set up test database
docker run -d \
  --name myerp-test-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=myerp_test \
  -p 5432:5432 \
  postgres:15

# Run full CI pipeline locally
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

## 📊 Workflow Status Badges

Add these to your README.md:

```markdown
![CI Status](https://github.com/pabit06/MyERP/workflows/CI%20Enhanced/badge.svg)
![Security](https://github.com/pabit06/MyERP/workflows/Security%20%26%20Dependency%20Checks/badge.svg)
![CD Status](https://github.com/pabit06/MyERP/workflows/CD%20-%20Deploy%20to%20Production/badge.svg)
```

## 🔧 Configuration

### Required Secrets

Set these in GitHub Settings → Secrets and variables → Actions:

#### For CI:

- `DATABASE_URL` - PostgreSQL connection string (optional, has fallback)
- `JWT_SECRET` - JWT signing secret (optional, has fallback)
- `NEXT_PUBLIC_API_URL` - Frontend API URL (optional, has fallback)

#### For CD:

- `GITHUB_TOKEN` - Automatically provided by GitHub
- Additional secrets based on your deployment target:
  - `DEPLOY_SSH_KEY` - SSH key for server deployment
  - `KUBE_CONFIG` - Kubernetes config for K8s deployments
  - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - For AWS deployments

#### For Notifications (Optional):

- `SLACK_WEBHOOK_URL` - Slack notifications
- `DISCORD_WEBHOOK_URL` - Discord notifications

### Environment Variables

Configure in GitHub Settings → Environments:

**Staging Environment:**

- `ENVIRONMENT_URL`: https://staging.myerp.example.com
- Protection rules: None (auto-deploy)

**Production Environment:**

- `ENVIRONMENT_URL`: https://myerp.example.com
- Protection rules: Required reviewers, wait timer

## 📈 Monitoring & Debugging

### View Workflow Runs

- Go to Actions tab in GitHub
- Click on specific workflow
- View logs, artifacts, and test results

### Download Artifacts

Workflows upload useful artifacts:

- **Integration Test Coverage** - Test coverage reports
- **Build Artifacts** - Compiled code
- **Playwright Reports** - E2E test results

### Common Issues

#### 1. Integration Tests Failing

```bash
# Check if mocks are properly set up
# Ensure vi.hoisted is used for mock initialization
```

#### 2. Build Failures

```bash
# Clear cache and rebuild
pnpm clean
pnpm install
pnpm build
```

#### 3. Deployment Issues

```bash
# Check deployment logs
# Verify environment variables
# Ensure Docker images are built correctly
```

## 🎯 Best Practices

### For Contributors

1. **Always run tests locally before pushing:**

   ```bash
   pnpm test
   pnpm lint
   pnpm type-check
   ```

2. **Keep workflows fast:**
   - Use caching effectively
   - Run jobs in parallel when possible
   - Skip unnecessary steps

3. **Write meaningful commit messages:**
   - Triggers appropriate workflows
   - Helps with automated changelogs

### For Maintainers

1. **Review workflow runs regularly**
2. **Update dependencies in workflows**
3. **Monitor workflow execution times**
4. **Keep secrets up to date**
5. **Review security scan results**

## 🔄 Workflow Updates

### Adding New Tests

To add new integration tests to CI:

1. Create test file in `apps/backend/tests/integration/`
2. Tests will automatically run in `test-backend-integration` job
3. No workflow changes needed!

### Modifying Workflows

1. Edit workflow files in `.github/workflows/`
2. Test changes in a feature branch
3. Merge to main after verification

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [pnpm Documentation](https://pnpm.io/)

## 🆘 Support

If you encounter issues with workflows:

1. Check workflow logs in GitHub Actions tab
2. Review this documentation
3. Check existing GitHub Issues
4. Create new issue with workflow run link

---

**Last Updated:** 2025-12-07  
**Maintained by:** MyERP Development Team
