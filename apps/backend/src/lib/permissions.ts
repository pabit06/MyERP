/**
 * Permission System
 *
 * Permission format: "resource:action" or "resource:subresource:action"
 * Examples:
 * - "members:view"
 * - "members:create"
 * - "members:update"
 * - "members:delete"
 * - "loans:approve"
 * - "compliance:ttr:approve"
 * - "workflow:member:approve"
 */

import { prisma } from './prisma.js';

export type Permission = string;

/**
 * Check if user is a system admin
 */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSystemAdmin: true },
  });
  return user?.isSystemAdmin === true;
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: string,
  tenantId: string | null, // Make nullable for system admins
  permission: Permission
): Promise<boolean> {
  // System admins have all permissions
  if (await isSystemAdmin(userId)) {
    return true;
  }

  // Non-system admins must have a tenant
  if (!tenantId) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || user.cooperativeId !== tenantId || !user.isActive) {
    return false;
  }

  // If user has no role, deny access
  if (!user.role) {
    return false;
  }

  // Get permissions from role
  const permissions = user.role.permissions as Permission[];

  if (!Array.isArray(permissions)) {
    return false;
  }

  // Check exact permission match
  if (permissions.includes(permission)) {
    return true;
  }

  // Check wildcard permissions (e.g., "members:*" matches "members:view")
  const permissionParts = permission.split(':');
  for (const perm of permissions) {
    if (perm === '*') {
      return true; // Super admin
    }

    const permParts = perm.split(':');

    // Check if permission matches with wildcards
    if (matchesPermission(permissionParts, permParts)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if permission parts match with wildcard support
 * Examples:
 * - ["members", "view"] matches ["members", "*"]
 * - ["members", "update"] matches ["members", "*"]
 * - ["compliance", "ttr", "approve"] matches ["compliance", "*", "*"]
 */
function matchesPermission(permissionParts: string[], permParts: string[]): boolean {
  if (permParts.length !== permissionParts.length) {
    return false;
  }

  for (let i = 0; i < permParts.length; i++) {
    if (permParts[i] !== '*' && permParts[i] !== permissionParts[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  tenantId: string | null, // Make nullable for system admins
  permissions: Permission[]
): Promise<boolean> {
  // System admins have all permissions
  if (await isSystemAdmin(userId)) {
    return true;
  }

  for (const permission of permissions) {
    if (await hasPermission(userId, tenantId, permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  tenantId: string | null, // Make nullable for system admins
  permissions: Permission[]
): Promise<boolean> {
  // System admins have all permissions
  if (await isSystemAdmin(userId)) {
    return true;
  }

  for (const permission of permissions) {
    if (!(await hasPermission(userId, tenantId, permission))) {
      return false;
    }
  }
  return true;
}

/**
 * Check if user has a specific role
 */
export async function hasRole(
  userId: string,
  tenantId: string | null, // Make nullable for system admins
  roleName: string
): Promise<boolean> {
  // System admins bypass role checks
  if (await isSystemAdmin(userId)) {
    return true;
  }

  // Non-system admins must have a tenant
  if (!tenantId) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || user.cooperativeId !== tenantId || !user.isActive) {
    return false;
  }

  if (!user.role) {
    return false;
  }

  return user.role.name.toLowerCase() === roleName.toLowerCase();
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(
  userId: string,
  tenantId: string | null, // Make nullable for system admins
  roleNames: string[]
): Promise<boolean> {
  // System admins bypass role checks
  if (await isSystemAdmin(userId)) {
    return true;
  }

  // Non-system admins must have a tenant
  if (!tenantId) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || user.cooperativeId !== tenantId || !user.isActive) {
    return false;
  }

  if (!user.role) {
    return false;
  }

  const userRoleName = user.role.name.toLowerCase();
  return roleNames.some((roleName) => roleName.toLowerCase() === userRoleName);
}

/**
 * Get user's permissions
 */
export async function getUserPermissions(
  userId: string,
  tenantId: string | null
): Promise<Permission[]> {
  // System admins have all permissions
  if (await isSystemAdmin(userId)) {
    return ['*'];
  }

  // Non-system admins must have a tenant
  if (!tenantId) {
    return [];
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || user.cooperativeId !== tenantId || !user.isActive || !user.role) {
    return [];
  }

  const permissions = user.role.permissions as Permission[];
  return Array.isArray(permissions) ? permissions : [];
}

/**
 * Get user's role name
 */
export async function getUserRole(userId: string, tenantId: string | null): Promise<string | null> {
  // System admins return special role name
  if (await isSystemAdmin(userId)) {
    return 'System Admin';
  }

  // Non-system admins must have a tenant
  if (!tenantId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || user.cooperativeId !== tenantId || !user.isActive || !user.role) {
    return null;
  }

  return user.role.name;
}

/**
 * Common permission constants
 */
export const PERMISSIONS = {
  // Members
  MEMBERS_VIEW: 'members:view',
  MEMBERS_CREATE: 'members:create',
  MEMBERS_UPDATE: 'members:update',
  MEMBERS_DELETE: 'members:delete',
  MEMBERS_APPROVE: 'members:approve',
  MEMBERS_REJECT: 'members:reject',

  // Loans
  LOANS_VIEW: 'loans:view',
  LOANS_CREATE: 'loans:create',
  LOANS_UPDATE: 'loans:update',
  LOANS_APPROVE: 'loans:approve',
  LOANS_REJECT: 'loans:reject',
  LOANS_DISBURSE: 'loans:disburse',

  // Savings
  SAVINGS_VIEW: 'savings:view',
  SAVINGS_CREATE: 'savings:create',
  SAVINGS_UPDATE: 'savings:update',
  SAVINGS_DELETE: 'savings:delete',

  // Shares
  SHARES_VIEW: 'shares:view',
  SHARES_ISSUE: 'shares:issue',
  SHARES_RETURN: 'shares:return',
  SHARES_TRANSFER: 'shares:transfer',

  // Compliance
  COMPLIANCE_VIEW: 'compliance:view',
  COMPLIANCE_TTR_VIEW: 'compliance:ttr:view',
  COMPLIANCE_TTR_APPROVE: 'compliance:ttr:approve',
  COMPLIANCE_TTR_REJECT: 'compliance:ttr:reject',
  COMPLIANCE_CASES_VIEW: 'compliance:cases:view',
  COMPLIANCE_CASES_CREATE: 'compliance:cases:create',
  COMPLIANCE_CASES_CLOSE: 'compliance:cases:close',
  COMPLIANCE_KYM_VIEW: 'compliance:kym:view',
  COMPLIANCE_RISK_VIEW: 'compliance:risk:view',
  COMPLIANCE_RISK_UPDATE: 'compliance:risk:update',
  COMPLIANCE_WATCHLIST_VIEW: 'compliance:watchlist:view',
  COMPLIANCE_WATCHLIST_WHITELIST: 'compliance:watchlist:whitelist',
  COMPLIANCE_STR_GENERATE: 'compliance:str:generate',

  // Accounting
  ACCOUNTING_VIEW: 'accounting:view',
  ACCOUNTING_CREATE: 'accounting:create',
  ACCOUNTING_UPDATE: 'accounting:update',
  ACCOUNTING_DELETE: 'accounting:delete',

  // Governance
  GOVERNANCE_VIEW: 'governance:view',
  GOVERNANCE_MEETINGS_CREATE: 'governance:meetings:create',
  GOVERNANCE_MEETINGS_UPDATE: 'governance:meetings:update',
  GOVERNANCE_COMMITTEES_CREATE: 'governance:committees:create',
  GOVERNANCE_COMMITTEES_UPDATE: 'governance:committees:update',
  GOVERNANCE_AGM_CREATE: 'governance:agm:create',
  GOVERNANCE_AGM_APPROVE: 'governance:agm:approve',

  // Workflow
  WORKFLOW_MEMBER_APPROVE: 'workflow:member:approve',
  WORKFLOW_MEMBER_REJECT: 'workflow:member:reject',
  WORKFLOW_LOAN_APPROVE: 'workflow:loan:approve',
  WORKFLOW_LOAN_REJECT: 'workflow:loan:reject',

  // Super Admin
  SUPER_ADMIN: '*',
} as const;
