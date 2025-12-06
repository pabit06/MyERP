import { APIRequestContext } from '@playwright/test';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Test Data Helper
 *
 * Creates and manages test data for E2E tests
 */

export interface TestUser {
  email: string;
  password: string;
  token?: string;
  userId?: string;
  cooperativeId?: string;
}

export interface TestCooperative {
  id: string;
  name: string;
  subdomain: string;
}

/**
 * Create or get test user for E2E tests
 */
export async function setupTestUser(): Promise<TestUser> {
  const testEmail = 'test@example.com';
  const testPassword = 'TestPassword123!';

  // Check if test user already exists
  let user = await prisma.user.findUnique({
    where: { email: testEmail },
    include: {
      cooperative: true,
    },
  });

  if (!user) {
    // Create test cooperative if it doesn't exist
    let cooperative = await prisma.cooperative.findFirst({
      where: { subdomain: 'test-coop' },
    });

    if (!cooperative) {
      // Get or create default plan
      let plan = await prisma.plan.findFirst({
        where: { name: 'Basic' },
      });

      if (!plan) {
        plan = await prisma.plan.create({
          data: {
            name: 'Basic',
            monthlyPrice: 0,
            enabledModules: [],
          },
        });
      }

      cooperative = await prisma.cooperative.create({
        data: {
          name: 'Test Cooperative',
          subdomain: 'test-coop',
          subscription: {
            create: {
              planId: plan.id,
              status: 'active',
            },
          },
        },
      });
    }

    // Get or create admin role
    let role = await prisma.role.findFirst({
      where: {
        cooperativeId: cooperative.id,
        name: 'Admin',
      },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          cooperativeId: cooperative.id,
          name: 'Admin',
          description: 'Administrator role for testing',
          permissions: {},
        },
      });
    }

    // Create test user
    const passwordHash = await hashPassword(testPassword);
    user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        cooperativeId: cooperative.id,
        roleId: role.id,
        isActive: true,
      },
      include: {
        cooperative: true,
      },
    });
  }

  if (!user.cooperativeId) {
    throw new Error('Test user must have a cooperativeId');
  }

  return {
    email: testEmail,
    password: testPassword,
    userId: user.id,
    cooperativeId: user.cooperativeId,
  };
}

/**
 * Login and get auth token
 */
export async function loginTestUser(request: APIRequestContext, user: TestUser): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to login test user: ${response.status()}`);
  }

  const body = await response.json();
  return body.token;
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  // Clean up test members created during tests
  const testCooperative = await prisma.cooperative.findFirst({
    where: { subdomain: 'test-coop' },
  });

  if (testCooperative) {
    // Delete test members (but keep the test user and cooperative)
    await prisma.member.deleteMany({
      where: {
        cooperativeId: testCooperative.id,
        email: {
          contains: '@example.com',
        },
      },
    });

    // Delete test loan applications
    await prisma.loanApplication.deleteMany({
      where: {
        cooperativeId: testCooperative.id,
      },
    });

    // Delete test loan products
    await prisma.loanProduct.deleteMany({
      where: {
        cooperativeId: testCooperative.id,
        code: {
          startsWith: 'PL-',
        },
      },
    });
  }
}
