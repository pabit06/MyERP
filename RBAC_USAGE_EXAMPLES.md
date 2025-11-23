# RBAC Usage Examples

यो document मा Role-Based Permission System को practical usage examples छन्।

## 📝 Quick Examples

### Example 1: Controller Method

```typescript
import { BaseController } from '../controllers/BaseController.js';
import { PERMISSIONS } from '../lib/permissions.js';
import { Request, Response } from 'express';

class MembersController extends BaseController {
  async getMembers(req: Request, res: Response) {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    // Check permission - throws error if not authorized
    await this.requirePermission(userId, tenantId, PERMISSIONS.MEMBERS_VIEW);

    const members = await this.prisma.member.findMany({
      where: { cooperativeId: tenantId },
    });

    res.json({ members });
  }

  async approveMember(req: Request, res: Response) {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;
    const { memberId } = req.params;

    // Check permission
    await this.requirePermission(userId, tenantId, PERMISSIONS.MEMBERS_APPROVE);

    // Or check multiple permissions (any one is enough)
    await this.requireAnyPermission(userId, tenantId, [
      PERMISSIONS.MEMBERS_APPROVE,
      PERMISSIONS.WORKFLOW_MEMBER_APPROVE,
    ]);

    // Approval logic...
  }
}
```

### Example 2: Route Middleware

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requirePermission, requireAnyPermission } from '../middleware/role.js';
import { PERMISSIONS } from '../lib/permissions.js';

const router = Router();

// Single permission
router.get(
  '/members',
  authenticate,
  requireTenant,
  requirePermission(PERMISSIONS.MEMBERS_VIEW),
  async (req, res) => {
    // Handler
  }
);

// Multiple permissions (any one)
router.post(
  '/members',
  authenticate,
  requireTenant,
  requireAnyPermission([PERMISSIONS.MEMBERS_CREATE, PERMISSIONS.MEMBERS_UPDATE]),
  async (req, res) => {
    // Handler
  }
);

// Role-based
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

### Example 3: Workflow Transition

```typescript
import { WorkflowDefinition } from '../lib/workflow-engine.js';

const memberWorkflow: WorkflowDefinition = {
  name: 'member-onboarding',
  initialState: 'application',
  states: [
    { name: 'application', label: 'Application' },
    { name: 'under_review', label: 'Under Review' },
    { name: 'approved', label: 'Approved' },
    { name: 'rejected', label: 'Rejected' },
  ],
  transitions: [
    {
      from: 'application',
      to: 'under_review',
      label: 'Submit for Review',
      // No role required - any user can submit
    },
    {
      from: 'under_review',
      to: 'approved',
      label: 'Approve',
      requiredRoles: ['Manager', 'Admin'], // Only Manager or Admin can approve
    },
    {
      from: 'under_review',
      to: 'rejected',
      label: 'Reject',
      requiredRoles: ['Manager', 'Admin', 'ComplianceOfficer'],
    },
  ],
};
```

### Example 4: Conditional Logic

```typescript
import { hasPermission } from '../lib/permissions.js';

async function canEditMember(userId: string, tenantId: string, memberId: string) {
  // Check if user has edit permission
  const canEdit = await hasPermission(userId, tenantId, PERMISSIONS.MEMBERS_UPDATE);

  if (!canEdit) {
    return false;
  }

  // Additional business logic
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  // Only allow editing if member is not approved
  return member?.workflowStatus !== 'active';
}
```

## 🎯 Common Patterns

### Pattern 1: View vs Edit

```typescript
// View - anyone with view permission
router.get('/resource/:id', requirePermission(PERMISSIONS.RESOURCE_VIEW), handler);

// Edit - requires update permission
router.put('/resource/:id', requirePermission(PERMISSIONS.RESOURCE_UPDATE), handler);
```

### Pattern 2: Admin Only

```typescript
// Super admin only
router.delete('/resource/:id', requirePermission(PERMISSIONS.SUPER_ADMIN), handler);

// Or specific admin role
router.delete('/resource/:id', requireRole('Admin'), handler);
```

### Pattern 3: Multiple Roles

```typescript
// Manager or Admin can approve
router.post('/loans/:id/approve', requireAnyRole(['Manager', 'Admin']), handler);
```

## 🔧 Creating Roles

### Example: Create Manager Role

```typescript
await prisma.role.create({
  data: {
    name: 'Manager',
    cooperativeId: 'coop-id',
    permissions: [
      PERMISSIONS.MEMBERS_VIEW,
      PERMISSIONS.MEMBERS_CREATE,
      PERMISSIONS.MEMBERS_UPDATE,
      PERMISSIONS.MEMBERS_APPROVE,
      PERMISSIONS.LOANS_VIEW,
      PERMISSIONS.LOANS_APPROVE,
      PERMISSIONS.WORKFLOW_MEMBER_APPROVE,
      PERMISSIONS.WORKFLOW_LOAN_APPROVE,
    ],
  },
});
```

### Example: Create View-Only Role

```typescript
await prisma.role.create({
  data: {
    name: 'Viewer',
    cooperativeId: 'coop-id',
    permissions: [
      PERMISSIONS.MEMBERS_VIEW,
      PERMISSIONS.LOANS_VIEW,
      PERMISSIONS.SAVINGS_VIEW,
      PERMISSIONS.ACCOUNTING_VIEW,
    ],
  },
});
```

### Example: Create Super Admin

```typescript
await prisma.role.create({
  data: {
    name: 'SuperAdmin',
    cooperativeId: 'coop-id',
    permissions: [PERMISSIONS.SUPER_ADMIN], // "*" - all permissions
  },
});
```

## ✅ Testing Permissions

```typescript
import { hasPermission, hasRole } from '../lib/permissions.js';

// Test permission
const canView = await hasPermission(userId, tenantId, PERMISSIONS.MEMBERS_VIEW);
console.log('Can view members:', canView);

// Test role
const isManager = await hasRole(userId, tenantId, 'Manager');
console.log('Is Manager:', isManager);

// Get all user permissions
import { getUserPermissions } from '../lib/permissions.js';
const permissions = await getUserPermissions(userId, tenantId);
console.log('User permissions:', permissions);
```

## 🚨 Error Handling

```typescript
try {
  await this.requirePermission(userId, tenantId, PERMISSIONS.MEMBERS_APPROVE);
  // Continue with logic
} catch (error) {
  if (error.message.includes('Access denied')) {
    res.status(403).json({ error: error.message });
    return;
  }
  throw error;
}
```

## 📚 Best Practices

1. **Use Constants**: Always use `PERMISSIONS` constant
2. **Check Early**: Check permissions at the start of methods
3. **Use Middleware**: Use middleware for route-level checks
4. **Document Permissions**: Document what each permission allows
5. **Test Permissions**: Test permission checks in your tests

## 🎉 Ready to Use!

The permission system is fully implemented and ready to use in your application!
