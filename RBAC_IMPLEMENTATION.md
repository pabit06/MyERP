# Role-Based Access Control (RBAC) Implementation

यो document मा Role-Based Permission System को implementation र usage को बारेमा जानकारी छ।

## ✅ Implementation Complete

### 1. Permission System (`apps/backend/src/lib/permissions.ts`)

**Features:**

- ✅ Permission checking functions
- ✅ Role checking functions
- ✅ Wildcard permission support (e.g., `members:*` matches `members:view`)
- ✅ Super admin support (`*` permission)
- ✅ Permission constants for common actions

**Permission Format:**

```
resource:action
resource:subresource:action
```

**Examples:**

- `members:view` - View members
- `members:create` - Create members
- `loans:approve` - Approve loans
- `compliance:ttr:approve` - Approve TTR reports
- `members:*` - All member actions (wildcard)
- `*` - Super admin (all permissions)

### 2. BaseController Updates (`apps/backend/src/controllers/BaseController.ts`)

**New Methods:**

- `validatePermissions()` - Check if user has permission
- `validateAnyPermission()` - Check if user has any of the permissions
- `validateAllPermissions()` - Check if user has all permissions
- `validateRole()` - Check if user has role
- `validateAnyRole()` - Check if user has any of the roles
- `requirePermission()` - Throw error if no permission
- `requireAnyPermission()` - Throw error if no permission (any)
- `requireRole()` - Throw error if no role

### 3. Workflow Engine Updates (`apps/backend/src/lib/workflow-engine.ts`)

**Features:**

- ✅ Role checking in workflow transitions
- ✅ Validates `requiredRoles` in transition definitions
- ✅ Throws error if user doesn't have required role

### 4. Middleware Updates (`apps/backend/src/middleware/role.ts`)

**New Middleware:**

- `requirePermission(permission)` - Require specific permission
- `requireAnyPermission(permissions[])` - Require any permission
- `requireAllPermissions(permissions[])` - Require all permissions
- `requireAnyRole(roleNames[])` - Require any role

## 📝 Usage Examples

### In Controllers

```typescript
import { BaseController } from './BaseController.js';
import { PERMISSIONS } from '../lib/permissions.js';

class MembersController extends BaseController {
  async getMembers(req: Request, res: Response) {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    // Check permission
    await this.requirePermission(userId, tenantId, PERMISSIONS.MEMBERS_VIEW);

    // Or check multiple permissions
    await this.requireAnyPermission(userId, tenantId, [
      PERMISSIONS.MEMBERS_VIEW,
      PERMISSIONS.MEMBERS_CREATE,
    ]);

    // Continue with logic...
  }

  async approveMember(req: Request, res: Response) {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    // Check permission
    await this.requirePermission(userId, tenantId, PERMISSIONS.MEMBERS_APPROVE);

    // Continue with approval logic...
  }
}
```

### In Routes (Middleware)

```typescript
import { requirePermission, requireAnyPermission, requireRole } from '../middleware/role.js';
import { PERMISSIONS } from '../lib/permissions.js';

// Require specific permission
router.get(
  '/members',
  authenticate,
  requireTenant,
  requirePermission(PERMISSIONS.MEMBERS_VIEW),
  async (req, res) => {
    // Handler
  }
);

// Require any permission
router.post(
  '/members',
  authenticate,
  requireTenant,
  requireAnyPermission([PERMISSIONS.MEMBERS_CREATE, PERMISSIONS.MEMBERS_UPDATE]),
  async (req, res) => {
    // Handler
  }
);

// Require role
router.post(
  '/members/:id/approve',
  authenticate,
  requireTenant,
  requireRole('Manager'),
  async (req, res) => {
    // Handler
  }
);
```

### In Workflow Definitions

```typescript
const memberWorkflow: WorkflowDefinition = {
  name: 'member-onboarding',
  initialState: 'application',
  states: [...],
  transitions: [
    {
      from: 'under_review',
      to: 'approved',
      label: 'Approve Member',
      requiredRoles: ['Manager', 'Admin'], // Only these roles can approve
    },
    {
      from: 'under_review',
      to: 'rejected',
      label: 'Reject Member',
      requiredRoles: ['Manager', 'Admin', 'ComplianceOfficer'],
    },
  ],
};
```

## 🔧 Permission Constants

Common permissions are defined in `PERMISSIONS` constant:

```typescript
import { PERMISSIONS } from '../lib/permissions.js';

// Use in code
PERMISSIONS.MEMBERS_VIEW;
PERMISSIONS.LOANS_APPROVE;
PERMISSIONS.COMPLIANCE_TTR_APPROVE;
PERMISSIONS.SUPER_ADMIN;
```

## 🎯 Setting Up Roles

### Create Role with Permissions

```typescript
await prisma.role.create({
  data: {
    name: 'Manager',
    cooperativeId: 'coop-id',
    permissions: [
      'members:view',
      'members:create',
      'members:update',
      'members:approve',
      'loans:view',
      'loans:approve',
      'workflow:member:approve',
    ],
  },
});
```

### Assign Role to User

```typescript
await prisma.user.update({
  where: { id: userId },
  data: {
    roleId: roleId,
  },
});
```

## 🔍 Permission Checking Logic

1. **Exact Match**: `members:view` matches `members:view`
2. **Wildcard Match**: `members:view` matches `members:*`
3. **Super Admin**: Any permission matches `*`
4. **Multi-level**: `compliance:ttr:approve` matches `compliance:*:*`

## 📋 Common Permission Patterns

### View Only Role

```json
["members:view", "loans:view", "savings:view"]
```

### Editor Role

```json
["members:view", "members:create", "members:update", "loans:view", "loans:create"]
```

### Manager Role

```json
["members:*", "loans:*", "workflow:member:approve", "workflow:loan:approve"]
```

### Super Admin

```json
["*"]
```

## 🚀 Migration Guide

### Existing Code

**Before:**

```typescript
// No permission check
async getMembers(req, res) {
  const members = await prisma.member.findMany();
  res.json({ members });
}
```

**After:**

```typescript
// With permission check
async getMembers(req, res) {
  await this.requirePermission(
    req.user!.userId,
    req.user!.tenantId,
    PERMISSIONS.MEMBERS_VIEW
  );

  const members = await prisma.member.findMany();
  res.json({ members });
}
```

### Routes

**Before:**

```typescript
router.get('/members', authenticate, requireTenant, handler);
```

**After:**

```typescript
router.get(
  '/members',
  authenticate,
  requireTenant,
  requirePermission(PERMISSIONS.MEMBERS_VIEW),
  handler
);
```

## ✅ Testing

### Test Permission Check

```typescript
import { hasPermission } from '../lib/permissions.js';

const canView = await hasPermission(userId, tenantId, 'members:view');
console.log('Can view members:', canView);
```

### Test Role Check

```typescript
import { hasRole } from '../lib/permissions.js';

const isManager = await hasRole(userId, tenantId, 'Manager');
console.log('Is Manager:', isManager);
```

## 📚 Best Practices

1. **Use Permission Constants**: Always use `PERMISSIONS` constant instead of strings
2. **Check Early**: Check permissions at the start of controller methods
3. **Use Middleware**: Use middleware for route-level permission checks
4. **Wildcards Carefully**: Use wildcards (`*`) only for admin roles
5. **Document Permissions**: Document what each permission allows

## 🎉 Summary

- ✅ Permission system fully implemented
- ✅ BaseController methods available
- ✅ Workflow engine role checking
- ✅ Middleware helpers available
- ✅ Wildcard and super admin support
- ✅ Ready for production use

## 🔄 Next Steps

1. Add permission checks to existing routes
2. Create default roles for new cooperatives
3. Add permission management UI (optional)
4. Audit permission usage in production
