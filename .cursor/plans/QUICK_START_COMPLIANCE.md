# Quick Start: Access Compliance & AML Features

## ✅ Step 1: Compliance Module is Already Enabled!

Your compliance module is already enabled. Great!

## 📋 Step 2: Assign ComplianceOfficer Role

To access all AML features (Dashboard, TTR Queue, Cases, etc.), you need the ComplianceOfficer role.

### Option A: Use the Script (Recommended)

```bash
cd apps/backend
pnpm run assign:compliance-role your-email@example.com
```

Replace `your-email@example.com` with your actual user email.

### Option B: Manual SQL

```sql
-- Find your user
SELECT id, email, "firstName", "lastName" FROM users WHERE email = 'your-email@example.com';

-- Find ComplianceOfficer role
SELECT id, name FROM roles WHERE name = 'ComplianceOfficer';

-- Assign role (replace USER_ID and ROLE_ID)
UPDATE users SET "roleId" = 'ROLE_ID' WHERE id = 'USER_ID';
```

## 🔄 Step 3: Refresh Browser

1. **Logout** from the application
2. **Login** again
3. You should now see **"Compliance"** in the navigation menu

## 🎯 What You'll See

### Main Compliance Page (`/compliance`)

- ✅ **Audit Logs** - View all system activity
- ✅ **Quick Links** to all AML features:
  - 🛡️ Compliance Dashboard
  - 📋 TTR Queue
  - 🚨 Suspicious Cases
  - 👤 KYM Status
  - 📊 Risk Report

### Compliance Dashboard (`/compliance/dashboard`)

- Statistics overview
- Pending TTRs count
- Open cases count
- Expired KYM count
- High-risk members count

### Other Features (Require ComplianceOfficer Role)

- **TTR Queue** - Manage Threshold Transaction Reports
- **Suspicious Cases** - Manage AML cases
- **KYM Status** - Track Know Your Member reviews
- **Risk Report** - Generate Schedule-3 reports

## 🐛 Troubleshooting

### Still Don't See Compliance Menu?

1. **Check Module Enablement:**

   ```bash
   cd apps/backend
   pnpm run enable:compliance
   ```

2. **Check Your Role:**
   - Login and check browser console
   - Verify `user.role.name` is `ComplianceOfficer`

3. **Hard Refresh:**
   - Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - Or clear browser cache

4. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for any errors in Console tab

### Can't Access Dashboard?

The Compliance Dashboard requires the `ComplianceOfficer` role. Make sure you:

1. Ran the assign script: `pnpm run assign:compliance-role your-email@example.com`
2. Logged out and logged back in
3. Your user has the role assigned

## 📞 Quick Commands Reference

```bash
# Enable compliance module
pnpm run enable:compliance

# Seed AML data (create ComplianceOfficer role)
pnpm run seed:aml

# Assign ComplianceOfficer role to user
pnpm run assign:compliance-role user@example.com
```

## ✅ Checklist

- [ ] Compliance module enabled ✅ (Already done!)
- [ ] ComplianceOfficer role created
- [ ] Role assigned to your user
- [ ] Logged out and logged back in
- [ ] See "Compliance" in navigation menu
- [ ] Can access `/compliance` page
- [ ] Can access `/compliance/dashboard` (if role assigned)
