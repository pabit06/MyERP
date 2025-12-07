import { test, expect } from '@playwright/test';
import { setupTestUser, loginTestUser, cleanupTestData, type TestUser } from './helpers/test-data.js';

/**
 * E2E Tests for Member Onboarding Flow
 * 
 * Critical flows:
 * 1. Create new member
 * 2. Update member KYM information
 * 3. Update member status (workflow transitions)
 * 4. Get member details
 */

const API_PREFIX = '/api';

test.describe('Member Onboarding Flow', () => {
  let authToken: string;
  let testUser: TestUser;
  let createdMemberId: string;
  let cooperativeId: string;

  test.beforeAll(async ({ request }) => {
    // Setup: Create test user and login
    testUser = await setupTestUser();
    authToken = await loginTestUser(request, testUser);
    testUser.token = authToken;
    cooperativeId = testUser.cooperativeId!;
  });

  test('should create a new member', async ({ request }) => {
    const memberData = {
      firstName: 'John',
      lastName: 'Doe',
      email: `john.doe.${Date.now()}@example.com`,
      phone: '9876543210',
      memberType: 'INDIVIDUAL',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      address: '123 Test Street',
      city: 'Kathmandu',
      state: 'Bagmati',
      postalCode: '44600',
      country: 'Nepal',
    };

    const response = await request.post(`${API_PREFIX}/members`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: memberData,
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    expect(body).toHaveProperty('member');
    expect(body.member).toHaveProperty('id');
    expect(body.member).toHaveProperty('memberNumber');
    expect(body.member.firstName).toBe(memberData.firstName);
    expect(body.member.lastName).toBe(memberData.lastName);
    expect(body.member.status).toBe('application');
    
    createdMemberId = body.member.id;
  });

  test('should get member details', async ({ request }) => {
    if (!createdMemberId) {
      test.skip();
    }

    const response = await request.get(`${API_PREFIX}/members/${createdMemberId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    expect(body).toHaveProperty('member');
    expect(body.member.id).toBe(createdMemberId);
    expect(body.member).toHaveProperty('memberNumber');
    expect(body.member).toHaveProperty('cooperativeId', cooperativeId);
  });

  test('should update member KYM information', async ({ request }) => {
    if (!createdMemberId) {
      test.skip();
    }

    const kymData = {
      citizenshipNumber: '12345/67/890',
      citizenshipIssuedDate: '2010-01-01',
      citizenshipIssuedDistrict: 'Kathmandu',
      permanentAddress: '123 Test Street',
      temporaryAddress: '456 Test Avenue',
      occupation: 'Software Developer',
      monthlyIncome: 50000,
      educationLevel: 'BACHELORS',
      maritalStatus: 'SINGLE',
      spouseName: null,
      fatherName: 'Father Name',
      motherName: 'Mother Name',
      grandfatherName: 'Grandfather Name',
      isComplete: true,
    };

    const response = await request.put(`${API_PREFIX}/members/${createdMemberId}/kym`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: kymData,
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    expect(body).toHaveProperty('citizenshipNumber', kymData.citizenshipNumber);
    expect(body).toHaveProperty('isComplete', true);
  });

  test('should update member status through workflow', async ({ request }) => {
    if (!createdMemberId) {
      test.skip();
    }

    // Transition: application -> under_review
    const response = await request.put(
      `${API_PREFIX}/members/${createdMemberId}/status`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          status: 'under_review',
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    expect(body).toHaveProperty('member');
    expect(body.member.status).toBe('under_review');
  });

  test('should list members with pagination', async ({ request }) => {
    const response = await request.get(`${API_PREFIX}/members?page=1&limit=10`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toHaveProperty('page', 1);
    expect(body.pagination).toHaveProperty('limit', 10);
    expect(body.pagination).toHaveProperty('total');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('should reject member creation with invalid data', async ({ request }) => {
    const invalidData = {
      // Missing required fields
      firstName: 'John',
      // Missing lastName, email, etc.
    };

    const response = await request.post(`${API_PREFIX}/members`, {
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
