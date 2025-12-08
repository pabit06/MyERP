import { test, expect } from '@playwright/test';
import {
  setupTestUser,
  loginTestUser,
  cleanupTestData,
  type TestUser,
} from './helpers/test-data.js';

/**
 * E2E Tests for Loan Application Flow
 *
 * Critical flows:
 * 1. Create loan product
 * 2. Create loan application
 * 3. Approve loan application
 * 4. Disburse loan
 * 5. Get loan details
 */

const API_PREFIX = '/api';

test.describe('Loan Application Flow', () => {
  let authToken: string;
  let testUser: TestUser;
  let loanProductId: string;
  let memberId: string;
  let loanApplicationId: string;

  test.beforeAll(async ({ request }) => {
    // Setup: Create test user and login
    testUser = await setupTestUser();
    authToken = await loginTestUser(request, testUser);
    testUser.token = authToken;

    // Create a test member for loan application
    const memberResponse = await request.post(`${API_PREFIX}/members`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        firstName: 'Loan',
        lastName: 'Test',
        email: `loan.test.${Date.now()}@example.com`,
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

  test('should create a loan product', async ({ request }) => {
    const productData = {
      name: 'Personal Loan',
      code: 'PL-001',
      description: 'Personal loan product for testing',
      interestRate: 12.5,
      maxLoanAmount: 1000000,
      minLoanAmount: 10000,
      maxTenureMonths: 60,
      minTenureMonths: 6,
      gracePeriodDays: 0,
      penaltyRate: 2.0,
      isActive: true,
    };

    const response = await request.post(`${API_PREFIX}/loans/products`, {
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

    loanProductId = body.product.id;
  });

  test('should get loan products list', async ({ request }) => {
    const response = await request.get(`${API_PREFIX}/loans/products?page=1&limit=10`, {
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

  test('should create a loan application', async ({ request }) => {
    if (!loanProductId || !memberId) {
      test.skip();
    }

    const applicationData = {
      memberId,
      productId: loanProductId,
      requestedAmount: 100000,
      requestedTenureMonths: 24,
      purpose: 'Home improvement',
      collateralDetails: 'Property documents',
    };

    const response = await request.post(`${API_PREFIX}/loans/applications`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: applicationData,
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body).toHaveProperty('application');
    expect(body.application).toHaveProperty('id');
    expect(body.application.memberId).toBe(memberId);
    expect(body.application.productId).toBe(loanProductId);
    expect(body.application.status).toBe('pending');

    loanApplicationId = body.application.id;
  });

  test('should get loan application details', async ({ request }) => {
    if (!loanApplicationId) {
      test.skip();
    }

    const response = await request.get(`${API_PREFIX}/loans/applications/${loanApplicationId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body).toHaveProperty('application');
    expect(body.application.id).toBe(loanApplicationId);
    expect(body.application).toHaveProperty('member');
    expect(body.application).toHaveProperty('product');
  });

  test('should update loan application status to approved', async ({ request }) => {
    if (!loanApplicationId) {
      test.skip();
    }

    const response = await request.put(
      `${API_PREFIX}/loans/applications/${loanApplicationId}/status`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          status: 'approved',
          remarks: 'Application approved for testing',
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body).toHaveProperty('application');
    expect(body.application.status).toBe('approved');
  });

  test('should list loan applications with pagination', async ({ request }) => {
    const response = await request.get(`${API_PREFIX}/loans/applications?page=1&limit=10`, {
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

  test('should reject loan application creation with invalid data', async ({ request }) => {
    const invalidData = {
      // Missing required fields
      memberId,
      // Missing productId, requestedAmount, etc.
    };

    const response = await request.post(`${API_PREFIX}/loans/applications`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: invalidData,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test.afterAll(async () => {
    // Cleanup: Delete test data
    await cleanupTestData();
  });
});
