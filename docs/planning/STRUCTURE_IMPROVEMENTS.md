# MyERP Structure Improvements Plan

## Overview

Implementing industry-standard improvements based on professional suggestions to enhance scalability, maintainability, and developer experience for long-term project health.

## 1. Backend Configuration Management

### Create `apps/backend/src/config/` folder structure

- **`apps/backend/src/config/env.ts`**: Environment variable validation using Zod
  - Validate all environment variables from `env.example`
  - Type-safe environment configuration
  - Fail fast on missing/invalid variables
  - Export typed config object

- **`apps/backend/src/config/logger.ts`**: Winston logger configuration
  - Configure winston with appropriate transports
  - Set up log levels based on NODE_ENV
  - File and console logging
  - **CRITICAL: Include redactor for sensitive keys** (passwords, API keys, JWT tokens)
  - Prevent accidental logging of sensitive data in request objects
  - Export logger instance

- **`apps/backend/src/config/index.ts`**: Centralized config exports

### Update existing files

- **`apps/backend/src/index.ts`**: Replace `dotenv.config()` and direct `process.env` access with typed config imports
- **`apps/backend/src/lib/auth.ts`**: Use config for JWT settings
- **`apps/backend/src/lib/notifications.ts`**: Use config for SMTP/SMS/FCM settings
- All other files using `process.env` directly should import from config

## 2. Enhanced Database Seeding

### Enhance `packages/db-schema/prisma/seed.ts`

Add comprehensive default data seeding following PEARLS standards for Nepali cooperatives:

- **Default Roles**: Create essential roles with appropriate permissions
  - **Super Admin**: Full system access (`*` permission) - for IT/system administrators
  - **Manager**: View all, approve workflows, manage operations (members:_, loans:_, workflow:\*)
  - **Teller/Staff**: Limited to voucher entry and basic operations (transactions:create, members:view)
  - Use permission constants from `apps/backend/src/lib/permissions.ts`
  - Each role with predefined permission sets matching cooperative hierarchy

- **Default Chart of Accounts**: Seed PEARLS-compliant Nepali cooperative chart of accounts
  - **Assets**: Current Assets, Fixed Assets, Investments
  - **Liabilities**: Current Liabilities, Long-term Liabilities
  - **Equity**: Share Capital (शेयर पुँजी), Reserves (संचित कोष), Retained Earnings
  - **Revenue**: Interest Income (ब्याज आम्दानी), Service Charges, Other Income
  - **Expenses**: Salaries, Rent, Utilities, Administrative Expenses
  - Hierarchical structure with proper account codes following cooperative accounting standards
  - Both Nepali and English names where applicable

- **Default Interest Rates**: Seed standard Nepali cooperative interest rates
  - **Savings Products**: 6-8% annual interest rate (default products)
  - **Loan Products**: 14.75% annual interest rate (standard loan rate)
  - Configurable per cooperative, but sensible defaults for quick setup

- **Sample Fiscal Years**: Create current and next fiscal years in BS format
  - **Dynamic Calculation**: Write utility function to calculate current Nepali Fiscal Year based on system date
  - Automatically determines current FY (e.g., 2081/082) and next FY (2082/083) without hardcoding
  - Start dates (Shrawan 1) and end dates (Ashadh end) properly calculated
  - Essential for voucher entry and accounting operations
  - Ensures new deployments next year don't require code changes

- **Default Workflow Templates**: Seed Maker -> Checker -> Approver workflow patterns
  - **Budget Approval Workflow**: Maker creates → Checker verifies → Approver approves
  - **Loan Approval Workflow**: Application → Review → Approval
  - **Member Onboarding Workflow**: Application → KYC Review → BOD Approval
  - **Document Approval Workflow**: Upload → Review → Approval
  - Each workflow with proper state transitions and role assignments

### Update seed script structure

- **Idempotency**: Use Prisma `upsert` (update if exists, create if not) wherever possible
  - Prevents duplicate entries if seed script runs multiple times
  - Use `findFirst` + conditional create pattern where upsert not applicable
  - Safe to run `npm run seed` multiple times without errors
- Support cooperative-specific seeding - seed data per cooperative when created
- Add CLI flags for selective seeding (--roles-only, --chart-only, etc.)
- Ensure system is "Ready to Use" immediately after deployment
- Target: Complete cooperative setup in 5 minutes (e.g., "Bhanjyang Cooperative")

## 3. Shared Zod Schemas Enhancement

### Create `packages/shared-types/src/zod-schemas.ts`

- **Separate DB Schemas from DTO Schemas**:
  - **DTO Schemas** (Data Transfer Objects): What the API accepts from frontend
    - May exclude fields that backend sets automatically (e.g., `isVerified`, `createdAt`)
    - Used for request validation in routes
  - **DB Schemas**: Full database model schemas (optional, for reference)
- **Accounting Schemas**: ChartOfAccounts, JournalEntry, Transaction DTOs
- **Member Schemas**: Enhanced member creation/update DTOs (already exists, expand)
- **Loan Schemas**: LoanProduct, LoanApplication, EMISchedule DTOs
- **Savings Schemas**: SavingProduct, SavingAccount DTOs
- **HRM Schemas**: Employee, Payroll, Leave DTOs
- **Compliance Schemas**: AML, KYC validation DTOs

### Update `packages/shared-types/src/index.ts`

- Export all Zod schemas
- Maintain backward compatibility with existing exports

### Usage

- Backend: Use for request validation in routes
- Frontend: Use for form validation and type inference
- Single source of truth for validation rules
- Prevents "Frontend says string, Backend expects number" type errors

## 4. Frontend Feature-Based Structure (Full Migration)

### Rationale

Full migration is essential to avoid inconsistency ("half old, half new" structure) that would:

- Make it difficult for new developers to understand the codebase
- Risk component duplication in multiple locations
- Create maintenance burden with mixed patterns

Since the project is already substantial, investing 1-2 hours now for complete migration is the wisest long-term decision.

### Create `apps/frontend-web/src/features/` folder

Complete migration from type-based to feature-based structure:

**Feature folders to create:**

- `features/auth/` - Login, register, authentication components
- `features/dashboard/` - Dashboard charts, layouts, overview components
- `features/accounting/` - General ledger, journal, day book, chart of accounts
- `features/members/` - Member management, KYC, member workflow
- `features/loans/` - Loan products, applications, EMI schedules
- `features/savings/` - Savings products, accounts, transactions
- `features/shares/` - Share management, certificates, share register
- `features/compliance/` - AML, KYC approvals, risk reports, TTR
- `features/governance/` - Meetings, AGM, committees, reports
- `features/hrm/` - Employees, payroll, leave, attendance
- `features/documents/` - DMS, Darta-Chalani, Patra-Chalani
- `features/reports/` - All report types (financial, member, loan, savings)
- `features/budget/` - Budget module (new feature, ready for future)

**Each feature folder structure:**

```
features/[feature-name]/
  ├── components/     # Feature-specific components
  ├── hooks/          # Feature-specific hooks
  ├── api/            # API calls for this feature
  ├── types/          # Feature-specific TypeScript types
  ├── utils/          # Feature-specific utilities
  └── index.ts        # Public exports (barrel export)
```

### Migration strategy (Full Migration)

1. Create complete `features/` folder structure for all existing features
2. Move ALL existing code from `app/`, `components/`, `lib/` to appropriate feature folders
3. Update ALL imports across the entire codebase in one pass
4. Keep truly shared components in `components/shared/` or `components/ui/` (UI primitives only)
5. Keep cross-cutting utilities in `lib/` (date utilities, formatters, etc.)
6. Update Next.js app router pages to import from feature folders
7. Ensure no duplicate code remains in old locations

### Next.js App Router Best Practices

- **Keep `app/` folder strictly for Routing**: Only `page.tsx`, `layout.tsx`, and minimal data fetching
- **UI Logic in Features**: All actual UI components, hooks, and business logic live in `features/`
- **Pages Import from Features**: `app/loans/page.tsx` imports components from `features/loans/components/`

### Circular Dependency Prevention

- **Avoid Cross-Feature Imports**: `features/loans` should NOT import from `features/accounting` and vice-versa
- **Shared Code Location**: If features need to share code, move that specific code to:
  - `components/shared/` for shared UI components
  - `lib/` for shared utilities
- **Dependency Direction**: Features → Shared Components/Utils (one-way dependency)

### Files to reorganize

- Move `app/[feature]/*` pages to use feature-based imports
- Move feature-specific components from `components/` to `features/[feature]/components/`
- Move feature hooks to `features/[feature]/hooks/`
- Create feature-specific API modules

## 5. Middleware/Context Updates (SaaS Multi-Tenancy)

### Request Context Enhancement

Since we're moving to a SaaS model with specific seeding per cooperative, ensure backend context properly tracks the active cooperative.

- **Typed Request Context**: Extend Express Request type to include:
  - `currentCooperativeId`: Extracted from header or subdomain
  - `currentUser`: Already exists, ensure it's properly typed
  - `currentRole`: User's role in the current cooperative context

- **Middleware Updates**:
  - Update `apps/backend/src/middleware/tenant.ts` to properly extract and set `currentCooperativeId`
  - Ensure subdomain-based routing works correctly
  - Validate cooperative access in middleware chain

- **Type Safety**:
  - Create `apps/backend/src/types/express.d.ts` to extend Express Request interface
  - Ensure all controllers can access `req.currentCooperativeId` with type safety

### Files to Update

- `apps/backend/src/middleware/tenant.ts` - Enhance cooperative extraction logic
- `apps/backend/src/types/express.d.ts` - Extend Request interface
- All controllers using `req.cooperativeId` - Update to use typed `req.currentCooperativeId`

## 6. Static Assets Organization

### Verify and document `apps/frontend-web/public/` structure

- **Current assets**: Logo, Nepali datepicker files
- **Add missing assets**:
  - `favicon.ico` and related icons
  - Default profile pictures
  - Placeholder images
  - Document templates (if any)

### Create asset organization structure

```
public/
  ├── images/
  │   ├── logos/
  │   ├── icons/
  │   └── placeholders/
  ├── fonts/ (if custom fonts)
  ├── documents/ (templates)
  └── favicon.ico
```

## Implementation Order

1. **Backend Config** (Foundation) - Must be done first
2. **Middleware/Context Updates** (SaaS foundation) - Do alongside backend config
3. **Shared Zod Schemas** (Used by both frontend and backend)
4. **Database Seeding** (Can be done in parallel)
5. **Frontend Feature Structure** (Largest refactor, do after config)
6. **Static Assets** (Can be done anytime)

## Files to Create

### Backend

- `apps/backend/src/config/env.ts`
- `apps/backend/src/config/logger.ts`
- `apps/backend/src/config/index.ts`

### Database

- Enhanced `packages/db-schema/prisma/seed.ts` (expand existing)

### Shared Types

- `packages/shared-types/src/zod-schemas.ts`

### Frontend

- New `apps/frontend-web/src/features/` directory structure
- Migration of existing files to feature folders

## Files to Modify

### Backend

- `apps/backend/src/index.ts` - Use config
- `apps/backend/src/lib/auth.ts` - Use config
- `apps/backend/src/lib/notifications.ts` - Use config
- `apps/backend/src/middleware/tenant.ts` - Enhance cooperative context
- `apps/backend/src/types/express.d.ts` - Extend Request interface
- All files using `process.env` directly

### Shared Types

- `packages/shared-types/src/index.ts` - Export schemas

### Frontend

- All component files (move to features)
- All page files (update imports)
- Import statements across codebase

## Technical "Gotcha" Checklist

### Critical Issues to Watch For

1. **Circular Dependencies**
   - When moving to `features/`, avoid cross-feature imports
   - If `features/loans` needs `features/accounting` code, move shared code to `lib/` or `components/shared/`
   - Use dependency direction: Features → Shared (one-way only)

2. **Next.js App Router Structure**
   - Keep `app/` folder strictly for routing (`page.tsx`, `layout.tsx`)
   - All UI logic must live in `features/`
   - Pages should only import and compose feature components

3. **Logger Security**
   - Ensure sensitive data redaction works correctly
   - Test that passwords, API keys, JWT tokens are never logged
   - Verify redactor catches nested objects in request bodies

4. **Seed Script Idempotency**
   - Test running seed script multiple times
   - Verify no duplicate entries created
   - Ensure upsert logic works for all models

5. **Dynamic Fiscal Year Calculation**
   - Test with different system dates
   - Verify correct FY calculation for edge cases (year boundaries)
   - Ensure works correctly when deployed next year without code changes

6. **Type Safety in Request Context**
   - Verify `req.currentCooperativeId` is properly typed
   - Ensure TypeScript catches missing cooperative context
   - Test middleware chain properly sets context

## Testing Considerations

- Verify environment validation works correctly (fail fast on missing vars)
- Test logger in different environments (dev, staging, production)
- Test logger redactor prevents sensitive data leakage
- Verify seed script doesn't break existing data (idempotency)
- Test dynamic fiscal year calculation with various dates
- Test Zod schemas match Prisma schema (DTO vs DB separation)
- Ensure all frontend imports work after migration
- Verify no broken routes after frontend refactor
- Test circular dependency detection (build should fail if present)
- Verify cooperative context is properly set in all routes

## Success Criteria

- System is "Ready to Use" within 5 minutes of deployment for any cooperative (e.g., "Bhanjyang Cooperative")
- All default data (roles, chart of accounts, interest rates, fiscal years) seeded automatically
- Fiscal years calculated dynamically based on current date (no hardcoding)
- Seed script is fully idempotent (safe to run multiple times)
- Frontend codebase is fully feature-based with no mixed patterns
- No circular dependencies between features
- Environment variables are type-safe and validated (fail fast)
- Logger properly redacts sensitive data (passwords, API keys, JWT tokens)
- Shared validation schemas prevent frontend-backend type mismatches
- DTO schemas properly separated from DB schemas
- Request context properly typed with `currentCooperativeId`
- Next.js App Router follows best practices (routing in `app/`, logic in `features/`)
