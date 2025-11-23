# How to Access Compliance & AML Features

## Issue: Compliance Menu Not Visible

The Compliance menu may not be visible for several reasons. Follow these steps to enable it:

## Step 1: Enable Compliance Module

The Compliance module must be enabled in your subscription plan.

### Option A: Update Your Plan (via API)

```bash
# Check current plan
curl -X GET http://localhost:3001/api/subscription \
  -H "Authorization: Bearer YOUR_TOKEN"

# Upgrade plan to include compliance module
# You need to update your plan's enabledModules to include "compliance"
```

### Option B: Update Database Directly

```sql
-- Check current plan
SELECT id, name, "enabledModules" FROM plans;

-- Update a plan to include compliance
UPDATE plans
SET "enabledModules" = '["cbs", "dms", "hrm", "governance", "inventory", "compliance"]'::jsonb
WHERE name = 'Your Plan Name';

-- Update subscription to use the updated plan
UPDATE subscriptions
SET "planId" = (SELECT id FROM plans WHERE "enabledModules"::text LIKE '%compliance%' LIMIT 1)
WHERE "cooperativeId" = 'YOUR_COOPERATIVE_ID';
```

### Option C: Use Upgrade Script

```bash
cd apps/backend
tsx scripts/upgrade-plan.ts
```

## Step 2: Assign ComplianceOfficer Role

Some features require the `ComplianceOfficer` role:

### Create ComplianceOfficer Role (if not exists)

```bash
cd apps/backend
tsx scripts/seed-aml-data.ts
```

### Assign Role to User

```sql
-- Find ComplianceOfficer role ID
SELECT id, name FROM roles WHERE name = 'ComplianceOfficer';

-- Assign role to user
UPDATE users
SET "roleId" = 'ROLE_ID_HERE'
WHERE email = 'user@example.com';
```

Or via API (if you have admin access):

```bash
# This would require an admin endpoint to assign roles
# For now, use SQL directly
```

## Step 3: Access Compliance Features

Once the module is enabled, you can access:

### Main Compliance Page (No Role Required)

- **URL:** `/compliance`
- **Menu:** "Compliance" in navigation
- **Features:** Audit Logs + Quick Links to all AML features

### Compliance Dashboard (Requires ComplianceOfficer Role)

- **URL:** `/compliance/dashboard`
- **Features:** Overview, statistics, quick actions

### Other AML Features (Requires ComplianceOfficer Role)

- **TTR Queue:** `/compliance/ttr-queue`
- **Suspicious Cases:** `/compliance/cases`
- **KYM Status:** `/compliance/kym-status`
- **Risk Report:** `/compliance/risk-report`

## Quick Check Script

Run this to check your current setup:

```sql
-- Check if compliance module is enabled
SELECT
  c.name as cooperative,
  p.name as plan,
  p."enabledModules" as modules,
  s.status as subscription_status
FROM cooperatives c
JOIN subscriptions s ON s."cooperativeId" = c.id
JOIN plans p ON p.id = s."planId"
WHERE c.id = 'YOUR_COOPERATIVE_ID';

-- Check if ComplianceOfficer role exists
SELECT id, name, "cooperativeId"
FROM roles
WHERE name = 'ComplianceOfficer';

-- Check user roles
SELECT
  u.email,
  u."firstName",
  u."lastName",
  r.name as role_name
FROM users u
LEFT JOIN roles r ON r.id = u."roleId"
WHERE u."cooperativeId" = 'YOUR_COOPERATIVE_ID';
```

## Troubleshooting

### Menu Still Not Visible?

1. **Check Module Enablement:**
   - Login and check browser console for any errors
   - Verify `cooperative.enabledModules` includes `"compliance"`

2. **Check User Role:**
   - Verify user has a role assigned
   - For Compliance Dashboard, role must be `ComplianceOfficer`

3. **Refresh Browser:**
   - Clear cache and hard refresh (Ctrl+Shift+R)
   - Logout and login again

4. **Check Navigation Component:**
   - The menu filters based on `hasModule('compliance')`
   - Verify your AuthContext is returning correct module list

### Quick Fix: Direct URL Access

Even if the menu isn't visible, you can access features directly:

- `/compliance` - Should work if compliance module is enabled
- `/compliance/dashboard` - Requires ComplianceOfficer role
- Other pages require ComplianceOfficer role

## Testing

1. **Enable Compliance Module:**

   ```sql
   UPDATE plans SET "enabledModules" = '["compliance"]'::jsonb WHERE id = 'PLAN_ID';
   ```

2. **Create Test User with ComplianceOfficer Role:**

   ```sql
   -- Create role
   INSERT INTO roles (id, name, "cooperativeId", permissions)
   VALUES ('role-id', 'ComplianceOfficer', 'coop-id', '["compliance:view"]'::jsonb);

   -- Assign to user
   UPDATE users SET "roleId" = 'role-id' WHERE email = 'test@example.com';
   ```

3. **Login and Check:**
   - You should see "Compliance" in navigation
   - Clicking it shows audit logs and quick links
   - Compliance Dashboard should be accessible if you have the role

## Need Help?

If you're still having issues:

1. Check browser console for errors
2. Verify database connection
3. Check that Prisma client is generated
4. Verify all migrations are applied
