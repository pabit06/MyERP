# E2E Tests for MyERP Backend

This directory contains end-to-end tests for critical user flows in the MyERP backend API.

## Overview

E2E tests verify that critical business flows work correctly from start to finish, testing the entire system including:

- API endpoints
- Authentication & authorization
- Database operations
- Business logic
- Error handling

## Test Files

### `auth.spec.ts`

Tests authentication flow:

- User login with valid/invalid credentials
- Token validation
- Get current user info
- Error handling for unauthorized requests

### `member-onboarding.spec.ts`

Tests member onboarding workflow:

- Create new member
- Update member KYM (Know Your Member) information
- Update member status through workflow transitions
- List members with pagination
- Validation and error handling

### `loan-application.spec.ts`

Tests loan application flow:

- Create loan product
- Create loan application
- Approve loan application
- Get loan details
- List loan applications
- Validation and error handling

## Running Tests

### Prerequisites

1. **Start the backend server:**

   ```bash
   cd apps/backend
   pnpm dev
   ```

2. **Set environment variables** (if needed):
   ```bash
   export API_BASE_URL=http://localhost:4000
   ```

### Run All E2E Tests

```bash
cd apps/backend
pnpm exec playwright test
```

### Run Specific Test File

```bash
pnpm exec playwright test e2e/auth.spec.ts
```

### Run Tests in UI Mode

```bash
pnpm exec playwright test --ui
```

### Run Tests in Debug Mode

```bash
pnpm exec playwright test --debug
```

### View Test Report

After running tests, view the HTML report:

```bash
pnpm exec playwright show-report
```

## Test Data Setup

**Important:** These tests require test data to be set up in your database. You have a few options:

1. **Use a separate test database** (recommended):
   - Set up a test database
   - Run migrations
   - Seed test data before running tests

2. **Use existing development data**:
   - Ensure you have a test user: `test@example.com` with password `TestPassword123!`
   - Or update the test files with your actual test credentials

3. **Create test data in `beforeAll` hooks**:
   - The tests currently assume test data exists
   - You can enhance them to create test data automatically

## Configuration

Test configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:4000` (configurable via `API_BASE_URL` env var)
- **Browser**: Chromium
- **Retries**: 2 retries in CI, 0 locally
- **Web Server**: Automatically starts backend server if not running

## Writing New Tests

When adding new E2E tests:

1. **Create a new test file** in `e2e/` directory
2. **Follow the existing pattern**:

   ```typescript
   import { test, expect } from '@playwright/test';

   test.describe('Feature Name', () => {
     let authToken: string;

     test.beforeAll(async ({ request }) => {
       // Setup: Login, create test data, etc.
     });

     test('should do something', async ({ request }) => {
       // Test implementation
     });

     test.afterAll(async ({ request }) => {
       // Cleanup: Delete test data
     });
   });
   ```

3. **Use descriptive test names** that explain what is being tested
4. **Include both positive and negative test cases**
5. **Clean up test data** in `afterAll` hooks

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after tests complete
3. **Assertions**: Use clear, descriptive assertions
4. **Error Handling**: Test both success and error scenarios
5. **Performance**: Keep tests fast - use parallel execution when possible

## CI/CD Integration

To run E2E tests in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Install Playwright
  run: pnpm exec playwright install --with-deps chromium

- name: Run E2E tests
  run: pnpm exec playwright test
  env:
    API_BASE_URL: http://localhost:4000
```

## Troubleshooting

### Tests fail with connection errors

- Ensure the backend server is running on the expected port
- Check `API_BASE_URL` environment variable

### Tests fail with authentication errors

- Verify test user credentials exist in the database
- Check that the test user has the necessary permissions

### Tests are slow

- Use parallel execution (already configured)
- Consider using a faster test database
- Optimize test data setup/teardown

## Future Enhancements

- [ ] Add tests for payment processing flow
- [ ] Add tests for savings account operations
- [ ] Add tests for compliance/AML flows
- [ ] Add tests for governance/meetings
- [ ] Add performance/load tests
- [ ] Add visual regression tests
- [ ] Set up test data seeding scripts
- [ ] Add test coverage reporting
