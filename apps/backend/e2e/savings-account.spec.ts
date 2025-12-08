import { test, expect } from '@playwright/test';
import {
  setupTestUser,
  loginTestUser,
  cleanupTestData,
  type TestUser,
} from './helpers/test-data.js';

/**
 * E2E Tests for Savings Account Flow
 *
 * Critical flows:
 * 1. Create saving product
 * 2. Create saving account
 * 3. Deposit to saving account
 * 4. Withdraw from saving account
 * 5. Get account balance
 */

const API_PREFIX = '/api';

test.describe('Savings Account Flow', () => {
  let authToken: string;
  let testUser: TestUser;
  let savingProductId: string;
  let memberId: string;
  let savingAccountId: string;

  test.beforeAll(async ({ request }) => {
    // Setup: Create test user and login
    testUser = await setupTestUser();
    authToken = await loginTestUser(request, testUser);
    testUser.token = authToken;

    // Create a test member for savings account
    const memberResponse = await request.post(`${API_PREFIX}/members`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        firstName: 'Savings',
        lastName: 'Test',
        email: `savings.test.${Date.now()}@example.com`,
        phone: '9876543210',
        memberType: 'INDIVIDUAL',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        address: '123 Test Street',
        city: 'Kathmandu',
        state: 'Bagmati',
        postalCode: '44600',
        country: 'Nepal',
      },
    });

    const memberBody = await memberResponse.json();
    memberId = memberBody.member.id;
  });

  test('should create a saving product', async ({ request }) => {
    const productData = {
      name: 'Regular Savings',
      code: 'RS-001',
      description: 'Regular savings product for testing',
      interestRate: 6.0,
      minBalance: 1000,
      maxBalance: 10000000,
      isActive: true,
    };

    const response = await request.post(`${API_PREFIX}/savings/products`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: productData,
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body).toHaveProperty('product');
    expect(body.product).toHaveProperty('id');
    expect(body.product.name).toBe(productData.name);
    expect(body.product.code).toBe(productData.code);

    savingProductId = body.product.id;
  });

  test('should get saving products list', async ({ request }) => {
    const response = await request.get(`${API_PREFIX}/savings/products?page=1&limit=10`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('should create a saving account', async ({ request }) => {
    if (!savingProductId || !memberId) {
      test.skip();
    }

    const accountData = {
      memberId,
      productId: savingProductId,
      initialDeposit: 5000,
    };

    const response = await request.post(`${API_PREFIX}/savings/accounts`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: accountData,
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body).toHaveProperty('account');
    expect(body.account).toHaveProperty('id');
    expect(body.account.memberId).toBe(memberId);
    expect(body.account.productId).toBe(savingProductId);
    expect(body.account).toHaveProperty('accountNumber');

    savingAccountId = body.account.id;
  });

  test('should get saving account details', async ({ request }) => {
    if (!savingAccountId) {
      test.skip();
    }

    const response = await request.get(`${API_PREFIX}/savings/accounts/${savingAccountId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body).toHaveProperty('account');
    expect(body.account.id).toBe(savingAccountId);
    expect(body.account).toHaveProperty('balance');
  });

  test('should deposit to saving account', async ({ request }) => {
    if (!savingAccountId) {
      test.skip();
    }

    const depositData = {
      amount: 10000,
      remarks: 'Test deposit',
      paymentMode: 'CASH',
    };

    const response = await request.post(
      `${API_PREFIX}/savings/accounts/${savingAccountId}/deposit`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: depositData,
      }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('transaction');
  });

  test('should withdraw from saving account', async ({ request }) => {
    if (!savingAccountId) {
      test.skip();
    }

    const withdrawData = {
      amount: 2000,
      remarks: 'Test withdrawal',
      paymentMode: 'CASH',
    };

    const response = await request.post(
      `${API_PREFIX}/savings/accounts/${savingAccountId}/withdraw`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: withdrawData,
      }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('transaction');
  });

  test('should list saving accounts with pagination', async ({ request }) => {
    const response = await request.get(`${API_PREFIX}/savings/accounts?page=1&limit=10`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('should reject deposit with invalid amount', async ({ request }) => {
    if (!savingAccountId) {
      test.skip();
    }

    const response = await request.post(
      `${API_PREFIX}/savings/accounts/${savingAccountId}/deposit`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          amount: -100, // Invalid negative amount
          remarks: 'Test',
        },
      }
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test.afterAll(async () => {
    // Cleanup: Delete test data
    await cleanupTestData();
  });
});
