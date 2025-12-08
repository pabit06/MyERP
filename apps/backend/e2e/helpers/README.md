# E2E Test Helpers

This directory contains helper utilities for E2E tests.

## test-data.ts

Provides utilities for managing test data:

### `setupTestUser()`

Creates or retrieves a test user for E2E tests. If the user doesn't exist, it will:

1. Create a test cooperative (subdomain: `test-coop`)
2. Create a default plan if needed
3. Create an admin role
4. Create the test user (`test@example.com`)

**Returns:** `TestUser` object with email, password, userId, and cooperativeId

### `loginTestUser(request, user)`

Logs in the test user and returns an authentication token.

**Parameters:**

- `request`: Playwright APIRequestContext
- `user`: TestUser object

**Returns:** JWT authentication token string

### `cleanupTestData()`

Cleans up test data created during E2E tests:

- Deletes test members
- Deletes test loan applications
- Deletes test loan products
- Keeps the test user and cooperative for reuse

## Usage Example

```typescript
import { setupTestUser, loginTestUser, cleanupTestData } from './helpers/test-data.js';

test.describe('My Feature', () => {
  let authToken: string;
  let testUser: TestUser;

  test.beforeAll(async ({ request }) => {
    // Setup test user
    testUser = await setupTestUser();

    // Login and get token
    authToken = await loginTestUser(request, testUser);
  });

  test.afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });
});
```
