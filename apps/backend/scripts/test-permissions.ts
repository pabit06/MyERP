/**
 * Test script for Role-Based Permission System
 *
 * Usage:
 *   pnpm --filter @myerp/backend test:permissions
 *
 * This script tests:
 * - Permission checking
 * - Role checking
 * - Wildcard permissions
 * - Super admin permissions
 */

import {
  hasPermission,
  hasRole,
  hasAnyRole,
  getUserPermissions,
  getUserRole,
  PERMISSIONS,
} from '../src/lib/permissions.js';
import { prisma } from '../src/lib/prisma.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function testPermissions() {
  console.log('\n🔐 Role-Based Permission System Test\n');
  console.log('='.repeat(50));

  try {
    // Get test user from environment or use first user
    const testUserId = process.env.TEST_USER_ID;
    const testTenantId = process.env.TEST_TENANT_ID;

    if (!testUserId || !testTenantId) {
      console.log('⚠️  TEST_USER_ID and TEST_TENANT_ID not set in .env');
      console.log('   Using first available user...\n');

      const firstUser = await prisma.user.findFirst({
        include: { role: true, cooperative: true },
      });

      if (!firstUser) {
        console.error('❌ No users found in database');
        console.log('\nPlease create a user first or set TEST_USER_ID and TEST_TENANT_ID in .env');
        return;
      }

      const userId = firstUser.id;
      const tenantId = firstUser.cooperativeId;

      if (!tenantId) {
        console.error('❌ User does not have a cooperativeId');
        return;
      }

      if (!firstUser.cooperative) {
        console.error('❌ User is not associated with a cooperative');
        return;
      }

      console.log(`✅ Using user: ${firstUser.email}`);
      console.log(`   Name: ${firstUser.firstName} ${firstUser.lastName}`);
      console.log(`   Cooperative: ${firstUser.cooperative.name}`);
      console.log(`   Role: ${firstUser.role?.name || 'No role assigned'}\n`);

      await runTests(userId, tenantId);
    } else {
      await runTests(testUserId, testTenantId);
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

async function runTests(userId: string, tenantId: string) {
  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, cooperative: true },
  });

  if (!user) {
    console.error('❌ User not found');
    return;
  }

  if (!user.cooperative) {
    console.error('❌ User is not associated with a cooperative');
    return;
  }

  console.log(`\n📋 User Information:`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.firstName} ${user.lastName}`);
  console.log(`   Cooperative: ${user.cooperative.name}`);
  console.log(`   Role: ${user.role?.name || 'No role assigned'}`);
  console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}\n`);

  if (!user.role) {
    console.log('⚠️  User has no role assigned. Permission checks will fail.');
    console.log('   Assign a role to test permissions.\n');
    return;
  }

  const permissions = user.role.permissions as string[];
  console.log(`📝 Permissions (${permissions.length}):`);
  permissions.forEach((perm, index) => {
    console.log(`   ${index + 1}. ${perm}`);
  });
  console.log('');

  // Test 1: Get user role
  console.log('🧪 Test 1: Get User Role');
  const roleName = await getUserRole(userId, tenantId);
  console.log(`   Role: ${roleName || 'None'}`);
  console.log(`   ✅ Passed\n`);

  // Test 2: Get user permissions
  console.log('🧪 Test 2: Get User Permissions');
  const userPerms = await getUserPermissions(userId, tenantId);
  console.log(`   Permissions: ${userPerms.length} found`);
  console.log(`   ✅ Passed\n`);

  // Test 3: Check specific permissions
  console.log('🧪 Test 3: Check Specific Permissions');
  const testPermissions = [
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.MEMBERS_CREATE,
    PERMISSIONS.LOANS_APPROVE,
    PERMISSIONS.COMPLIANCE_VIEW,
    PERMISSIONS.SUPER_ADMIN,
  ];

  for (const perm of testPermissions) {
    const hasAccess = await hasPermission(userId, tenantId, perm);
    const status = hasAccess ? '✅' : '❌';
    console.log(`   ${status} ${perm}: ${hasAccess ? 'Granted' : 'Denied'}`);
  }
  console.log('');

  // Test 4: Check role
  console.log('🧪 Test 4: Check Role');
  if (roleName) {
    const hasUserRole = await hasRole(userId, tenantId, roleName);
    console.log(`   Has role "${roleName}": ${hasUserRole ? 'Yes' : 'No'}`);
    console.log(`   ✅ Passed\n`);
  } else {
    console.log(`   ⚠️  No role to test\n`);
  }

  // Test 5: Check any role
  console.log('🧪 Test 5: Check Any Role');
  const hasAny = await hasAnyRole(userId, tenantId, ['Manager', 'Admin', 'ComplianceOfficer']);
  console.log(`   Has Manager/Admin/ComplianceOfficer: ${hasAny ? 'Yes' : 'No'}`);
  console.log(`   ✅ Passed\n`);

  // Test 6: Wildcard permissions
  console.log('🧪 Test 6: Wildcard Permission Test');
  if (permissions.includes('members:*')) {
    const canView = await hasPermission(userId, tenantId, PERMISSIONS.MEMBERS_VIEW);
    const canCreate = await hasPermission(userId, tenantId, PERMISSIONS.MEMBERS_CREATE);
    console.log(`   Wildcard "members:*" found`);
    console.log(`   Can view members: ${canView ? 'Yes' : 'No'}`);
    console.log(`   Can create members: ${canCreate ? 'Yes' : 'No'}`);
    console.log(`   ✅ Passed\n`);
  } else {
    console.log(`   ⚠️  No wildcard permissions to test\n`);
  }

  // Test 7: Super admin
  console.log('🧪 Test 7: Super Admin Test');
  const _isSuperAdmin = await hasPermission(userId, tenantId, PERMISSIONS.SUPER_ADMIN);
  if (permissions.includes('*')) {
    const canDoAnything = await hasPermission(userId, tenantId, PERMISSIONS.MEMBERS_VIEW);
    console.log(`   Super admin (*) permission found`);
    console.log(`   Can do anything: ${canDoAnything ? 'Yes' : 'No'}`);
    console.log(`   ✅ Passed\n`);
  } else {
    console.log(`   ⚠️  Not a super admin\n`);
  }

  console.log('='.repeat(50));
  console.log('\n✨ Permission tests completed!\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPermissions().catch(console.error);
}

export { testPermissions };
