# बाँकी कामहरू (Remaining Tasks)

यो document मा सबै बाँकी कामहरूको सूची छ।

## 🔴 High Priority (जरुरी कामहरू)

### 1. Share Module Enhancement (शेयर मोड्युल बढाउने)

**Status:** ✅ **COMPLETE** - All features implemented!

**Database Schema:**

- [x] ✅ ShareAccount model with `certificateNo`, `issueDate`
- [x] ✅ `ShareTxType` enum (PURCHASE, RETURN, TRANSFER, BONUS)
- [x] ✅ `journalId` in ShareTransaction (links to JournalEntry)
- [x] ✅ `createdBy` in ShareTransaction (tracks user)

**Backend API:**

- [x] ✅ Payment mode support (Cash/Bank/Saving Account Debit)
- [x] ✅ All endpoints: dashboard, statements, certificates, issue, return, transfer, bonus
- [x] ✅ Transactions linked to journal entries via `journalId`
- [x] ✅ `createdBy` user tracking

**Accounting Service:**

- [x] ✅ `postShareCapital` with payment mode support
- [x] ✅ `postShareReturn` function implemented

**Frontend:**

- [x] ✅ All frontend pages created (Dashboard, Issue, Return, Statement, Certificates, Register)
- [x] ✅ Certificate print page with beautiful design
- [x] ✅ Sidebar integration with submenu

**Files:**

- `packages/db-schema/prisma/schema.prisma` - Schema complete
- `apps/backend/src/routes/shares.ts` - All routes implemented
- `apps/backend/src/services/share.service.ts` - All services implemented
- `apps/backend/src/services/accounting.ts` - Accounting functions complete
- `apps/frontend-web/src/app/shares/` - All pages implemented
- `apps/frontend-web/src/components/Sidebar.tsx` - Menu integrated

**Note:** The Share Module is fully functional and ready for use!

---

### 2. Notification Service Integration (सूचना सेवा एकीकरण)

**Status:** ✅ **COMPLETE** - All integrations implemented!

**SMS Integration:**

- [x] ✅ Integrated with Twilio SMS gateway
- [x] ✅ Console logging fallback for development
- [x] ✅ Environment variable configuration support

**Email Integration:**

- [x] ✅ Integrated with Nodemailer (SMTP support)
- [x] ✅ Works with Gmail, SendGrid, AWS SES, Outlook, and any SMTP server
- [x] ✅ Console logging fallback for development
- [x] ✅ Environment variable configuration support

**Push Notifications:**

- [x] ✅ Basic push notification structure implemented
- [x] ✅ Ready for FCM/APNs integration (can be extended)
- [x] ✅ Stores notifications in database

**Configuration:**

- [x] ✅ Environment variables documented in `env.example`
- [x] ✅ SMS: Twilio support with fallback to console
- [x] ✅ Email: SMTP support with fallback to console

**Files:**

- `apps/backend/src/lib/notifications.ts` - All integrations complete
- `apps/backend/env.example` - Configuration documented

**Note:**

- SMS: Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` to enable real SMS
- Email: Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` to enable real emails
- Both services fall back to console logging if not configured (useful for development)

---

### 3. Role-Based Permission System (भूमिका-आधारित अनुमति प्रणाली)

**Status:** ✅ **COMPLETE** - Fully implemented!

**Permission System:**

- [x] ✅ Created permission checking utility (`apps/backend/src/lib/permissions.ts`)
- [x] ✅ Permission format: `resource:action` or `resource:subresource:action`
- [x] ✅ Wildcard permission support (`members:*` matches all member actions)
- [x] ✅ Super admin support (`*` permission)
- [x] ✅ Permission constants defined

**BaseController:**

- [x] ✅ Implemented `validatePermissions()` method
- [x] ✅ Implemented `validateAnyPermission()` method
- [x] ✅ Implemented `validateAllPermissions()` method
- [x] ✅ Implemented `validateRole()` and `validateAnyRole()` methods
- [x] ✅ Implemented `requirePermission()` and `requireRole()` methods

**Workflow Engine:**

- [x] ✅ Implemented role checking in workflow transitions
- [x] ✅ Validates `requiredRoles` in transition definitions
- [x] ✅ Throws error if user doesn't have required role

**Middleware:**

- [x] ✅ `requirePermission()` middleware
- [x] ✅ `requireAnyPermission()` middleware
- [x] ✅ `requireAllPermissions()` middleware
- [x] ✅ `requireAnyRole()` middleware

**Files:**

- `apps/backend/src/lib/permissions.ts` - Permission system (NEW)
- `apps/backend/src/controllers/BaseController.ts` - Updated with permission methods
- `apps/backend/src/lib/workflow-engine.ts` - Updated with role checking
- `apps/backend/src/middleware/role.ts` - Updated with permission middleware

**Documentation:**

- `RBAC_IMPLEMENTATION.md` - Complete implementation guide

**Note:**

- Permission system is production-ready
- Use `PERMISSIONS` constants for type safety
- Supports wildcard permissions and super admin
- Can be used in controllers, routes, and workflows

---

## 🟡 Medium Priority (मध्यम प्राथमिकता)

### 4. HRM Module Completion (HRM मोड्युल पूरा गर्ने)

**Status:** ✅ **COMPLETE** - All features implemented!

**HRM Dashboard:**

- [x] ✅ Created backend endpoint for HRM dashboard stats (`GET /api/hrm/dashboard/stats`)
- [x] ✅ Updated frontend to display real statistics
- [x] ✅ Shows total employees, active employees, pending leave requests, employees on leave, recent attendance, pending payroll runs, and department distribution

**HRM Payroll:**

- [x] ✅ Created payroll preview modal component (`PayrollPreviewModal.tsx`)
- [x] ✅ Integrated preview modal into payroll page
- [x] ✅ Modal displays employee-wise breakdown and totals summary

**HRM Training:**

- [x] ✅ Training endpoints already existed in backend
- [x] ✅ Removed outdated comment from frontend
- [x] ✅ Frontend properly integrated with existing endpoints

**Files:**

- `apps/backend/src/routes/hrm.ts` - Added dashboard stats endpoint
- `apps/frontend-web/src/app/hrm/dashboard/page.tsx` - Updated with real data
- `apps/frontend-web/src/components/PayrollPreviewModal.tsx` - New component
- `apps/frontend-web/src/app/hrm/payroll/page.tsx` - Integrated preview modal
- `apps/frontend-web/src/app/hrm/training/page.tsx` - Removed outdated comment

**Note:** The HRM module is now fully functional with all required features!

---

### 5. Source of Funds File Upload (स्रोत फाइल अपलोड)

**Status:** UI exists, upload not implemented

**SourceOfFundsModal:**

- [ ] Implement file upload to server
- [ ] Currently returns placeholder path (line 49 in `apps/frontend-web/src/components/SourceOfFundsModal.tsx`)

**Files:**

- `apps/frontend-web/src/components/SourceOfFundsModal.tsx`

---

### 6. Governance Module Search & Filtering (शासन मोड्युल खोज र फिल्टर)

**Status:** Core features complete, search/filter missing

**Missing Features:**

- [ ] Committees: Search by name, filter by type
- [ ] Meetings: Search by title, filter by type, status, date range
- [ ] AGM: Search by fiscal year, filter by status, date range
- [ ] Committee Members: Search by member name, filter by position

**Note:** Listed as optional enhancement in `.cursor/plans/governance-implementation-status.md`

---

## 🟢 Low Priority (कम प्राथमिकता)

### 7. Testing Expansion (परीक्षण विस्तार)

**Status:** Basic tests exist, coverage minimal

**Backend:**

- [ ] Add more unit tests for critical services (Loans, Savings)
- [ ] Currently only has tests for AccountingService

**Frontend:**

- [ ] Add more component tests for complex forms
- [ ] Currently only has tests for KymForm

**Files:**

- `apps/backend/src/services/` (various service files)
- `apps/frontend-web/src/components/` (various components)

---

### 8. Mobile App Standards (मोबाइल एप मानक)

**Status:** Not yet applied

**Mobile Member App:**

- [ ] Apply linting standards
- [ ] Add testing setup
- [ ] Similar to what was done for Backend and Frontend

**Files:**

- `apps/mobile-member/`

---

### 9. Documentation (कागजात)

**Status:** Basic documentation exists

**API Documentation:**

- [ ] Generate comprehensive API documentation
- [ ] Keep `testsprite_tests/tmp/code_summary.json` updated

**Files:**

- Various documentation files in `docs/`

---

### 10. Workflow History Table (वर्कफ्लो इतिहास तालिका)

**Status:** Commented as TODO

**Workflow Engine:**

- [ ] Create generic workflow history table
- [ ] Currently has TODO comment (line 289 in `apps/backend/src/lib/workflow-engine.ts`)

**Files:**

- `apps/backend/src/lib/workflow-engine.ts`

---

### 11. Workflow Registry Exposure (वर्कफ्लो रजिस्ट्री एक्सपोज)

**Status:** Commented as TODO

**Workflow Routes:**

- [ ] Expose workflow registry endpoint
- [ ] Currently has TODO comment (line 90 in `apps/backend/src/routes/workflow.ts`)

**Files:**

- `apps/backend/src/routes/workflow.ts`

---

## 📋 Summary by Category

### Backend Tasks

1. Share module enhancements (schema, API, accounting)
2. Notification service integration (SMS, Email, Push)
3. Role-based permission system
4. HRM backend endpoints
5. Workflow history table
6. Workflow registry exposure

### Frontend Tasks

1. Share module pages (all pages from scratch)
2. HRM dashboard backend integration
3. HRM payroll preview modal
4. Source of Funds file upload
5. Governance search & filtering

### Testing & Quality

1. Expand test coverage (Backend & Frontend)
2. Apply standards to Mobile app
3. API documentation

---

## 🎯 Recommended Order of Implementation

1. **Share Module** - Core business functionality
2. **Notification Service** - Important for user engagement
3. **Role-Based Permissions** - Security critical
4. **HRM Backend** - Complete existing frontend
5. **Source of Funds Upload** - Complete existing feature
6. **Governance Search** - Nice to have
7. **Testing Expansion** - Ongoing improvement
8. **Documentation** - Ongoing improvement

---

## 📝 Notes

- Check `.cursor/plans/` directory for detailed implementation plans
- Some TODOs might be intentional placeholders for future features
- Database migrations may be needed for schema changes
- Test thoroughly before deploying to production
