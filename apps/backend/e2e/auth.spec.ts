import { test, expect } from '@playwright/test';
import { setupTestUser, loginTestUser, type TestUser } from './helpers/test-data.js';

/**
 * E2E Tests for Authentication Flow
 * 
 * Critical flows:
 * 1. User login with valid credentials
 * 2. User login with invalid credentials
 * 3. Get current user info
 * 4. Token validation
 */

const API_PREFIX = '/api';

test.describe('Authentication Flow', () => {
  let authToken: string;
  let testUser: TestUser;

  test.beforeAll(async () => {
    // Setup: Create test user if needed
    testUser = await setupTestUser();
  });

  test('should login with valid credentials', async ({ request }) => {
    const response = await request.post(`${API_PREFIX}/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user');
    expect(body.user).toHaveProperty('email', testUser.email);
    expect(body.user).toHaveProperty('cooperativeId');
    
    authToken = body.token;
    testUser.token = authToken;
  });

  test('should reject login with invalid email', async ({ request }) => {
    const response = await request.post(`${API_PREFIX}/auth/login`, {
      data: {
        email: 'invalid@example.com',
        password: 'password123',
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should reject login with invalid password', async ({ request }) => {
    const response = await request.post(`${API_PREFIX}/auth/login`, {
      data: {
        email: testUser.email,
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should reject login with missing credentials', async ({ request }) => {
    const response = await request.post(`${API_PREFIX}/auth/login`, {
      data: {
        email: testUser.email,
        // Missing password
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should get current user info with valid token', async ({ request }) => {
    // First login to get token
    const loginResponse = await request.post(`${API_PREFIX}/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });
    
    const loginBody = await loginResponse.json();
    const token = loginBody.token;

    // Get current user
    const response = await request.get(`${API_PREFIX}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    expect(body).toHaveProperty('user');
    expect(body.user).toHaveProperty('email', testUser.email);
    expect(body.user).toHaveProperty('cooperativeId');
    expect(body.user).toHaveProperty('enabledModules');
  });

  test('should reject request with invalid token', async ({ request }) => {
    const response = await request.get(`${API_PREFIX}/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('should reject request without token', async ({ request }) => {
    const response = await request.get(`${API_PREFIX}/auth/me`);

    expect(response.status()).toBe(401);
  });
});
