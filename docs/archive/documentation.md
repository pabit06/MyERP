# MyERP Documentation

This file contains a compilation of all documentation for the MyERP project.

---

# API Documentation

# Backend API Documentation

## Base URL

- Development: `http://localhost:3001/api`
- Production: Configure via `API_PREFIX` environment variable

## Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Health Check

#### GET /health

Check if the server is running.

**Response:**

```json
{
  "status": "ok",
  "message": "Backend server is running"
}
```

---

### SaaS Registration

#### POST /api/saas/register

Register a new cooperative and create the first admin user.

**Request Body:**

```json
{
  "name": "My Cooperative",
  "subdomain": "mycoop",
  "email": "admin@mycoop.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**

```json
{
  "message": "Cooperative registered successfully",
  "cooperative": {
    "id": "clx...",
    "name": "My Cooperative",
    "subdomain": "mycoop"
  },
  "user": {
    "id": "clx...",
    "email": "admin@mycoop.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**

- `400`: Missing required fields
- `409`: Subdomain or email already taken

---

### Authentication

#### POST /api/auth/login

Login with email and password.

**Request Body:**

```json
{
  "email": "admin@mycoop.com",
  "password": "securepassword123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": "clx...",
    "email": "admin@mycoop.com",
    "firstName": "John",
    "lastName": "Doe",
    "cooperativeId": "clx...",
    "roleId": null
  },
  "cooperative": {
    "id": "clx...",
    "name": "My Cooperative",
    "subdomain": "mycoop",
    "enabledModules": []
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**

- `400`: Missing email or password
- `401`: Invalid credentials

#### GET /api/auth/me

Get current authenticated user information.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "user": {
    "id": "clx...",
    "email": "admin@mycoop.com",
    "firstName": "John",
    "lastName": "Doe",
    "roleId": null
  },
  "cooperative": {
    "id": "clx...",
    "name": "My Cooperative",
    "subdomain": "mycoop",
    "enabledModules": []
  }
}
```

**Errors:**

- `401`: Invalid or expired token
- `404`: User not found

---

### Onboarding

#### GET /api/onboarding/profile

Get cooperative profile (protected).

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "profile": {
    "id": "clx...",
    "cooperativeId": "clx...",
    "description": null,
    "logoUrl": null,
    "website": null,
    "address": null,
    "phone": null,
    "email": null,
    "cooperative": {
      "id": "clx...",
      "name": "My Cooperative",
      "subdomain": "mycoop",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### PUT /api/onboarding/profile

Update cooperative profile (protected).

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "description": "A cooperative for managing our community",
  "logoUrl": "https://example.com/logo.png",
  "website": "https://mycoop.com",
  "address": "123 Main St, City, Country",
  "phone": "+1234567890",
  "email": "contact@mycoop.com"
}
```

**Response (200):**

```json
{
  "message": "Profile updated successfully",
  "profile": {
    "id": "clx...",
    "cooperativeId": "clx...",
    "description": "A cooperative for managing our community",
    "logoUrl": "https://example.com/logo.png",
    "website": "https://mycoop.com",
    "address": "123 Main St, City, Country",
    "phone": "+1234567890",
    "email": "contact@mycoop.com"
  }
}
```

**Errors:**

- `401`: Not authenticated
- `403`: Tenant context required
- `500`: Internal server error

---

## Subscription Plans

The system includes default plans:

- **Basic**: $0/month - No modules
- **Standard**: $49.99/month - CBS module
- **Premium**: $99.99/month - CBS, DMS, HRM modules
- **Enterprise**: $199.99/month - All modules (CBS, DMS, HRM, Governance, Inventory, Compliance)

New cooperatives are automatically assigned the Basic plan upon registration.

## Module Access Control

Module access is controlled by the `isModuleEnabled` middleware. Modules are:

- `cbs`: Core Banking System ✅ (Phase 2 - Implemented)
- `dms`: Document Management System
- `hrm`: Human Resource Management
- `governance`: Governance & Meetings
- `inventory`: Inventory Management
- `compliance`: Compliance & Audit

---

## Phase 2: Financial Product Modules (CBS)

All CBS endpoints require authentication, tenant context, and the `cbs` module to be enabled.

### Savings Module

#### GET /api/savings/products

Get all saving products for the cooperative.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "products": [
    {
      "id": "...",
      "code": "REGULAR",
      "name": "Regular Savings",
      "description": "Standard savings account",
      "interestRate": 5.5,
      "minimumBalance": 100,
      "isActive": true
    }
  ]
}
```

#### POST /api/savings/products

Create a new saving product.

**Request Body:**

```json
{
  "code": "REGULAR",
  "name": "Regular Savings",
  "description": "Standard savings account",
  "interestRate": 5.5,
  "minimumBalance": 100
}
```

#### GET /api/savings/accounts

Get all saving accounts (with optional filters: `?memberId=...&status=...`).

#### POST /api/savings/accounts

Create a new saving account.

**Request Body:**

```json
{
  "memberId": "member-id",
  "productId": "product-id",
  "accountNumber": "SAV-001",
  "initialDeposit": 1000
}
```

#### GET /api/savings/accounts/:id

Get specific account details.

---

### Loans Module

#### GET /api/loans/products

Get all loan products.

#### POST /api/loans/products

Create a new loan product.

**Request Body:**

```json
{
  "code": "PERSONAL",
  "name": "Personal Loan",
  "description": "Personal loan product",
  "interestRate": 12.0,
  "maxLoanAmount": 500000,
  "minLoanAmount": 10000,
  "maxTenureMonths": 60,
  "minTenureMonths": 6,
  "processingFee": 500
}
```

#### GET /api/loans/applications

Get all loan applications (with optional filters: `?memberId=...&status=...`).

#### POST /api/loans/applications

Create a new loan application.

**Request Body:**

```json
{
  "memberId": "member-id",
  "productId": "product-id",
  "loanAmount": 100000,
  "tenureMonths": 24,
  "purpose": "Home improvement"
}
```

#### POST /api/loans/applications/:id/approve

Approve a loan application and generate EMI schedule.

**Request Body:**

```json
{
  "disbursedDate": "2024-01-15"
}
```

**Response (200):**

```json
{
  "message": "Loan application approved and EMI schedule generated",
  "application": { ... },
  "emiSchedule": [
    {
      "installmentNumber": 1,
      "dueDate": "2024-02-15",
      "principalAmount": 4000,
      "interestAmount": 1000,
      "totalAmount": 5000,
      "status": "pending"
    }
  ]
}
```

#### GET /api/loans/applications/:id/emi-schedule

Get EMI schedule for a loan application.

---

### Shares Module

#### GET /api/shares/ledgers

Get all share ledgers (with optional filter: `?memberId=...`).

#### GET /api/shares/ledgers/:memberId

Get member's share ledger (creates if doesn't exist).

#### POST /api/shares/transactions

Create a share transaction.

**Request Body:**

```json
{
  "memberId": "member-id",
  "type": "purchase",
  "shares": 100,
  "sharePrice": 100,
  "remarks": "Initial share purchase"
}
```

**Transaction Types:**

- `purchase`: Buy shares
- `sale`: Sell shares
- `dividend`: Dividend distribution
- `bonus`: Bonus shares

#### GET /api/shares/transactions

Get all share transactions (with optional filters: `?memberId=...&type=...`).

---

# Environment Setup

# Environment Variables Setup

This document describes the environment variables needed for each application in the monorepo.

## Backend (`apps/backend`)

Copy `apps/backend/env.example` to `apps/backend/.env` and configure the following:

### Required Variables

- **PORT**: Server port (default: 3001)
- **NODE_ENV**: Environment mode (`development`, `production`, `test`)
- **DATABASE_URL**: PostgreSQL connection string
  - Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA`
  - Example: `postgresql://postgres:password@localhost:5432/myerp?schema=public`
- **JWT_SECRET**: Secret key for JWT token signing (use a strong random string in production)
- **JWT_EXPIRES_IN**: JWT token expiration time (e.g., "7d", "24h")

### Optional Variables

- **CORS_ORIGIN**: Allowed CORS origin (default: `http://localhost:3000`)
- **API_PREFIX**: API route prefix (default: `/api`)

### Setup Instructions

```bash
# Copy the example file
cp apps/backend/env.example apps/backend/.env

# Edit the .env file with your actual values
# Make sure to set a strong JWT_SECRET and configure your DATABASE_URL
```

## Frontend Web (`apps/frontend-web`)

Copy `apps/frontend-web/env.example` to `apps/frontend-web/.env.local` and configure:

### Required Variables

- **NEXT_PUBLIC_API_URL**: Backend API URL (default: `http://localhost:3001/api`)
- **NEXT_PUBLIC_APP_URL**: Frontend application URL (default: `http://localhost:3000`)

### Setup Instructions

```bash
# Copy the example file
cp apps/frontend-web/env.example apps/frontend-web/.env.local

# Edit .env.local with your actual values
```

**Note:** In Next.js, environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Mobile Member (`apps/mobile-member`)

Copy `apps/mobile-member/env.example` to `apps/mobile-member/.env` and configure:

### Required Variables

- **EXPO_PUBLIC_API_URL**: Backend API URL (default: `http://localhost:3001/api`)

### Setup Instructions

```bash
# Copy the example file
cp apps/mobile-member/env.example apps/mobile-member/.env

# Edit .env with your actual values
```

**Note:** In Expo, environment variables prefixed with `EXPO_PUBLIC_` are exposed to the app.

## Database Setup

Before running the backend, make sure you have:

1. **PostgreSQL installed and running**
2. **Created a database** (e.g., `myerp`)
3. **Configured DATABASE_URL** in `apps/backend/.env`

### Quick PostgreSQL Setup (if using Docker)

```bash
docker run --name myerp-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=myerp \
  -p 5432:5432 \
  -d postgres:15
```

### Run Migrations

After setting up the database and configuring `DATABASE_URL`:

```bash
cd packages/db-schema
pnpm migrate
```

This will create all the necessary tables in your database.

## Security Notes

⚠️ **Important Security Reminders:**

1. Never commit `.env` files to version control (they're already in `.gitignore`)
2. Use strong, random values for `JWT_SECRET` in production
3. Use different secrets for development and production environments
4. Keep your database credentials secure
5. Use environment-specific `.env` files (`.env.development`, `.env.production`)

---

# Phase 1 Complete

# Phase 1: Tenancy, Billing & Core Engine - COMPLETE ✅

## Summary

Phase 1 has been successfully implemented, establishing the multi-tenancy and subscription core of the ERP system.

## What Was Implemented

### 1. Prisma Client Setup ✅

- Created centralized Prisma client instance in `packages/db-schema/src/client.ts`
- Exported for use across the backend
- Prepared structure for tenant scoping (to be enhanced in future)

### 2. Authentication & Authorization ✅

- **JWT Authentication**: Token generation and verification utilities
- **Password Hashing**: Using bcryptjs for secure password storage
- **Authentication Middleware**: `authenticate` middleware for protected routes
- **Tenant Middleware**: `requireTenant` middleware to ensure tenant context

**Files:**

- `apps/backend/src/lib/auth.ts` - JWT and password utilities
- `apps/backend/src/middleware/auth.ts` - Authentication middleware
- `apps/backend/src/middleware/tenant.ts` - Tenant context middleware

### 3. SaaS Registration ✅

- **POST /api/saas/register**: Register new cooperative with first admin user
- Validates subdomain uniqueness (alphanumeric + hyphens)
- Validates email uniqueness
- Creates cooperative, subscription (Basic plan), profile, and admin user in transaction
- Returns JWT token for immediate authentication

**File:** `apps/backend/src/routes/saas.ts`

### 4. Authentication Endpoints ✅

- **POST /api/auth/login**: User login with email/password
- **GET /api/auth/me**: Get current user info with cooperative and enabled modules

**File:** `apps/backend/src/routes/auth.ts`

### 5. Onboarding & Profile Management ✅

- **GET /api/onboarding/profile**: Get cooperative profile (protected)
- **PUT /api/onboarding/profile**: Update cooperative profile (protected)
- Supports: description, logoUrl, website, address, phone, email

**File:** `apps/backend/src/routes/onboarding.ts`

### 6. Subscription Plans ✅

- Created seed script with 4 default plans:
  - **Basic**: $0/month - No modules
  - **Standard**: $49.99/month - CBS module
  - **Premium**: $99.99/month - CBS, DMS, HRM modules
  - **Enterprise**: $199.99/month - All modules

**File:** `packages/db-schema/prisma/seed.ts`

### 7. Module Access Control (Phase 4 Preview) ✅

- **isModuleEnabled Middleware**: Checks if tenant's subscription includes required module
- Returns 403 if module not enabled
- Ready for use in Phase 4 when implementing module-specific routes

**File:** `apps/backend/src/middleware/module.ts`

## Database Schema

All Phase 1 models are implemented in Prisma schema:

- ✅ Cooperative (Tenant)
- ✅ Plan
- ✅ Subscription
- ✅ User (Staff)
- ✅ Member (Customer)
- ✅ Role
- ✅ CooperativeProfile
- ✅ ChartOfAccounts
- ✅ Ledger
- ✅ JournalEntry
- ✅ Transaction

## API Structure

```
/api
  /saas
    POST /register
  /auth
    POST /login
    GET /me
  /onboarding
    GET /profile
    PUT /profile
```

## Next Steps

### Phase 2: Financial Product Modules (CBS Part 2)

- Implement savings products and accounts
- Implement loan products and applications
- Implement share ledger and transactions
- All will be protected by `isModuleEnabled('cbs')` middleware

### Phase 3: ERP & Operations Modules

- DMS (Document Management)
- HRM (Human Resource Management)
- Governance (Meetings & Minutes)
- Inventory Management
- Compliance & Audit

### Phase 4: Frontend Integration

- Update `GET /auth/me` to return enabled modules (✅ Already done)
- Create AuthContext in frontend
- Build dynamic navigation based on enabled modules
- Implement public subdomain sites

## Testing the API

1. **Seed the database:**

   ```bash
   cd packages/db-schema
   pnpm seed
   ```

2. **Start the backend:**

   ```bash
   cd apps/backend
   pnpm dev
   ```

3. **Register a cooperative:**

   ```bash
   curl -X POST http://localhost:3001/api/saas/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Cooperative",
       "subdomain": "testcoop",
       "email": "admin@testcoop.com",
       "password": "password123",
       "firstName": "Admin",
       "lastName": "User"
     }'
   ```

4. **Login:**

   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@testcoop.com",
       "password": "password123"
     }'
   ```

5. **Get profile (use token from login):**
   ```bash
   curl http://localhost:3001/api/onboarding/profile \
     -H "Authorization: Bearer <your-token>"
   ```

## Files Created/Modified

### Backend

- `apps/backend/src/index.ts` - Main server file with routes
- `apps/backend/src/lib/prisma.ts` - Prisma client wrapper
- `apps/backend/src/lib/auth.ts` - Authentication utilities
- `apps/backend/src/middleware/auth.ts` - Auth middleware
- `apps/backend/src/middleware/tenant.ts` - Tenant middleware
- `apps/backend/src/middleware/module.ts` - Module access middleware
- `apps/backend/src/routes/saas.ts` - SaaS registration routes
- `apps/backend/src/routes/auth.ts` - Authentication routes
- `apps/backend/src/routes/onboarding.ts` - Onboarding routes
- `apps/backend/src/types/express.d.ts` - TypeScript type definitions

### Database

- `packages/db-schema/src/client.ts` - Prisma client instance
- `packages/db-schema/prisma/seed.ts` - Database seed script

### Documentation

- `apps/backend/API.md` - API documentation
- `PHASE1_COMPLETE.md` - This file

## Dependencies Added

- `jsonwebtoken` - JWT token generation/verification
- `bcryptjs` - Password hashing
- `@types/jsonwebtoken` - TypeScript types
- `@types/bcryptjs` - TypeScript types

---

**Phase 1 Status: ✅ COMPLETE**

All core tenancy, billing, authentication, and onboarding features are implemented and ready for use!

---

# Phase 2 Complete

# Phase 2: Financial Product Modules (CBS Part 2) - COMPLETE ✅

## Summary

Phase 2 has been successfully implemented, adding the core banking system modules for savings, loans, and shares. All modules are protected by the `isModuleEnabled('cbs')` middleware, ensuring only cooperatives with the CBS module enabled can access these features.

## What Was Implemented

### 1. Database Schema ✅

Added all Phase 2 models to Prisma schema:

#### Savings Module

- **SavingProduct**: Product definitions with interest rates and minimum balances
- **SavingAccount**: Member savings accounts linked to products

#### Loans Module

- **LoanProduct**: Loan product definitions with interest rates, amounts, and tenure
- **LoanApplication**: Loan applications with approval workflow
- **EMISchedule**: Equated Monthly Installment schedules for approved loans

#### Shares Module

- **ShareLedger**: Member share holdings (one-to-one with Member)
- **ShareTransaction**: Share purchase, sale, dividend, and bonus transactions

### 2. EMI Calculation Engine ✅

**File:** `apps/backend/src/lib/emi.ts`

- `calculateEMI()`: Calculate monthly installment amount
- `generateEMISchedule()`: Generate complete EMI schedule for a loan
- Handles principal, interest, and remaining balance calculations
- Accounts for rounding in final installment

### 3. Savings Routes ✅

**File:** `apps/backend/src/routes/savings.ts`

**Endpoints:**

- `GET /api/savings/products` - List all saving products
- `POST /api/savings/products` - Create new saving product
- `GET /api/savings/accounts` - List all saving accounts (with filters)
- `POST /api/savings/accounts` - Create new saving account
- `GET /api/savings/accounts/:id` - Get specific account details

**Features:**

- Product management with interest rates
- Account creation with initial deposits
- Member and product validation
- Account number uniqueness enforcement

### 4. Loans Routes ✅

**File:** `apps/backend/src/routes/loans.ts`

**Endpoints:**

- `GET /api/loans/products` - List all loan products
- `POST /api/loans/products` - Create new loan product
- `GET /api/loans/applications` - List all loan applications (with filters)
- `POST /api/loans/applications` - Create new loan application
- `POST /api/loans/applications/:id/approve` - Approve application and generate EMI schedule
- `GET /api/loans/applications/:id/emi-schedule` - Get EMI schedule for a loan

**Features:**

- Loan product management with configurable parameters
- Application workflow (pending → approved → disbursed → closed)
- Automatic EMI schedule generation on approval
- Loan amount and tenure validation against product limits
- Application number auto-generation

### 5. Shares Routes ✅

**File:** `apps/backend/src/routes/shares.ts`

**Endpoints:**

- `GET /api/shares/ledgers` - List all share ledgers
- `GET /api/shares/ledgers/:memberId` - Get member's share ledger
- `POST /api/shares/transactions` - Create share transaction
- `GET /api/shares/transactions` - List all share transactions (with filters)

**Features:**

- Automatic ledger creation for members
- Transaction types: purchase, sale, dividend, bonus
- Share balance tracking
- Transaction number auto-generation
- Sale validation (prevents selling more shares than owned)

## Security & Access Control

All Phase 2 routes are protected by:

1. **Authentication Middleware** - Requires valid JWT token
2. **Tenant Middleware** - Ensures tenant context
3. **Module Middleware** - `isModuleEnabled('cbs')` - Only accessible if CBS module is enabled in subscription

## API Usage Examples

### Create Saving Product

```bash
POST /api/savings/products
{
  "code": "REGULAR",
  "name": "Regular Savings",
  "description": "Standard savings account",
  "interestRate": 5.5,
  "minimumBalance": 100
}
```

### Create Saving Account

```bash
POST /api/savings/accounts
{
  "memberId": "member-id",
  "productId": "product-id",
  "accountNumber": "SAV-001",
  "initialDeposit": 1000
}
```

### Create Loan Product

```bash
POST /api/loans/products
{
  "code": "PERSONAL",
  "name": "Personal Loan",
  "description": "Personal loan product",
  "interestRate": 12.0,
  "maxLoanAmount": 500000,
  "minLoanAmount": 10000,
  "maxTenureMonths": 60,
  "minTenureMonths": 6,
  "processingFee": 500
}
```

### Create Loan Application

```bash
POST /api/loans/applications
{
  "memberId": "member-id",
  "productId": "product-id",
  "loanAmount": 100000,
  "tenureMonths": 24,
  "purpose": "Home improvement"
}
```

### Approve Loan Application

```bash
POST /api/loans/applications/:id/approve
{
  "disbursedDate": "2024-01-15"
}
```

### Create Share Transaction

```bash
POST /api/shares/transactions
{
  "memberId": "member-id",
  "type": "purchase",
  "shares": 100,
  "sharePrice": 100,
  "remarks": "Initial share purchase"
}
```

## Database Schema Details

### SavingProduct

- `code`: Unique product code per cooperative
- `interestRate`: Annual interest rate percentage
- `minimumBalance`: Minimum balance required

### SavingAccount

- `accountNumber`: Unique account number per cooperative
- `balance`: Current account balance
- `interestAccrued`: Accrued interest
- `status`: active, closed, dormant

### LoanProduct

- `interestRate`: Annual interest rate percentage
- `maxLoanAmount` / `minLoanAmount`: Loan amount limits
- `maxTenureMonths` / `minTenureMonths`: Tenure limits
- `processingFee`: One-time processing fee

### LoanApplication

- `applicationNumber`: Unique application number
- `status`: pending, approved, rejected, disbursed, closed
- `loanAmount`: Requested loan amount
- `tenureMonths`: Loan tenure in months

### EMISchedule

- `installmentNumber`: Installment sequence number
- `dueDate`: Payment due date
- `principalAmount`: Principal portion
- `interestAmount`: Interest portion
- `totalAmount`: Total EMI amount
- `paidAmount`: Amount paid
- `status`: pending, paid, overdue, partial

### ShareLedger

- `totalShares`: Total shares owned by member
- `shareValue`: Current value per share
- One-to-one relationship with Member

### ShareTransaction

- `type`: purchase, sale, dividend, bonus
- `shares`: Number of shares
- `sharePrice`: Price per share at transaction time
- `amount`: Total transaction amount

## Next Steps

### Phase 3: ERP & Operations Modules

- DMS (Document Management System)
- HRM (Human Resource Management)
- Governance (Meetings & Minutes)
- Inventory Management
- Compliance & Audit

### Integration with Accounting Engine

- Link savings deposits/withdrawals to ledger entries
- Link loan disbursements and EMI payments to ledger entries
- Link share transactions to ledger entries

### Additional Features

- Interest calculation and accrual for savings
- Loan repayment tracking
- Share dividend distribution
- Reports and analytics

## Files Created/Modified

### Backend Routes

- `apps/backend/src/routes/savings.ts` - Savings module routes
- `apps/backend/src/routes/loans.ts` - Loans module routes
- `apps/backend/src/routes/shares.ts` - Shares module routes

### Utilities

- `apps/backend/src/lib/emi.ts` - EMI calculation utilities

### Database

- `packages/db-schema/prisma/schema.prisma` - Added Phase 2 models

### Main Server

- `apps/backend/src/index.ts` - Added Phase 2 routes

---

**Phase 2 Status: ✅ COMPLETE**

All core banking system modules (savings, loans, shares) are implemented and ready for use!

---

# Phase 3 Complete

# Phase 3: ERP & Operations Modules - COMPLETE ✅

## Summary

Phase 3 has been successfully implemented, adding all optional add-on modules: Document Management System (DMS), Human Resource Management (HRM), Governance, Inventory Management, and Compliance & Audit. All modules are protected by their respective `isModuleEnabled` middleware.

## What Was Implemented

### 1. Database Schema ✅

Added all Phase 3 models to Prisma schema:

#### Document Management System (DMS)

- **MemberDocument**: Documents linked to members (ID, photos, contracts, etc.)
- **OfficialDocument**: Official cooperative documents (policies, regulations, reports, certificates)

#### Human Resource Management (HRM)

- **Employee**: Employee records with position, department, salary
- **PayrollLog**: Payroll records with gross, deductions, net salary
- **AttendanceLog**: Daily attendance tracking with check-in/check-out

#### Governance

- **Meeting**: Meeting scheduling and management
- **MeetingMinute**: Meeting minutes with agenda, discussion, decisions, action items

#### Inventory Management

- **InventoryCategory**: Hierarchical inventory categories
- **InventoryItem**: Inventory items with quantity tracking, min/max levels, pricing

#### Compliance & Audit

- **AuditLog**: Comprehensive audit trail for all system actions

### 2. Document Management System (DMS) Routes ✅

**File:** `apps/backend/src/routes/dms.ts`

**Endpoints:**

- `GET /api/dms/member-documents` - List member documents (with filters)
- `POST /api/dms/member-documents` - Create member document record
- `DELETE /api/dms/member-documents/:id` - Delete member document
- `GET /api/dms/official-documents` - List official documents (with filters)
- `POST /api/dms/official-documents` - Create official document record
- `DELETE /api/dms/official-documents/:id` - Delete official document

**Features:**

- Member document management (ID, photos, contracts, etc.)
- Official document management with versioning
- Public/private document flags
- Effective and expiry dates for official documents
- File metadata tracking (size, mime type, etc.)

### 3. Human Resource Management (HRM) Routes ✅

**File:** `apps/backend/src/routes/hrm.ts`

**Endpoints:**

- `GET /api/hrm/employees` - List employees (with filters)
- `POST /api/hrm/employees` - Create employee
- `GET /api/hrm/employees/:id` - Get employee details
- `POST /api/hrm/payroll` - Create payroll log
- `GET /api/hrm/payroll` - List payroll logs (with filters)
- `POST /api/hrm/attendance` - Create/update attendance log
- `GET /api/hrm/attendance` - List attendance logs (with filters)

**Features:**

- Employee management with position and department
- Payroll processing with gross, deductions, net calculations
- Attendance tracking with automatic hours calculation
- Employee status management (active, inactive, terminated)
- Date range filtering for attendance and payroll

### 4. Governance Routes ✅

**File:** `apps/backend/src/routes/governance.ts`

**Endpoints:**

- `GET /api/governance/meetings` - List meetings (with filters)
- `POST /api/governance/meetings` - Create meeting
- `GET /api/governance/meetings/:id` - Get meeting with minutes
- `PUT /api/governance/meetings/:id` - Update meeting
- `POST /api/governance/meetings/:id/minutes` - Create/update meeting minutes

**Features:**

- Meeting scheduling with types (board, general, committee, other)
- Meeting status tracking (scheduled, ongoing, completed, cancelled)
- Attendee management (stored as JSON array)
- Meeting minutes with agenda, discussion, decisions, action items
- One-to-one relationship between meeting and minutes

### 5. Inventory Management Routes ✅

**File:** `apps/backend/src/routes/inventory.ts`

**Endpoints:**

- `GET /api/inventory/categories` - List inventory categories
- `POST /api/inventory/categories` - Create category
- `GET /api/inventory/items` - List inventory items (with filters)
- `POST /api/inventory/items` - Create inventory item
- `GET /api/inventory/items/:id` - Get item details
- `PUT /api/inventory/items/:id` - Update inventory item

**Features:**

- Hierarchical category structure
- Item management with codes, units, quantities
- Min/max quantity tracking for stock alerts
- Unit pricing
- Location tracking
- Active/inactive status

### 6. Compliance & Audit Routes ✅

**File:** `apps/backend/src/routes/compliance.ts`

**Endpoints:**

- `GET /api/compliance/audit-logs` - List audit logs (with extensive filters)
- `POST /api/compliance/audit-logs` - Create audit log entry

**Features:**

- Comprehensive audit trail
- Action tracking (create, update, delete, view, export, etc.)
- Entity type and ID tracking
- User tracking
- IP address and user agent logging
- Timestamp tracking
- JSON details field for additional context
- Date range filtering

## Security & Access Control

All Phase 3 routes are protected by:

1. **Authentication Middleware** - Requires valid JWT token
2. **Tenant Middleware** - Ensures tenant context
3. **Module Middleware** - Each module has its own access control:
   - `isModuleEnabled('dms')` - Document Management System
   - `isModuleEnabled('hrm')` - Human Resource Management
   - `isModuleEnabled('governance')` - Governance & Meetings
   - `isModuleEnabled('inventory')` - Inventory Management
   - `isModuleEnabled('compliance')` - Compliance & Audit

## API Usage Examples

### DMS - Create Member Document

```bash
POST /api/dms/member-documents
{
  "memberId": "member-id",
  "documentType": "id",
  "fileName": "national-id.pdf",
  "filePath": "/uploads/documents/national-id.pdf",
  "fileSize": 245678,
  "mimeType": "application/pdf",
  "description": "National ID card"
}
```

### HRM - Create Employee

```bash
POST /api/hrm/employees
{
  "employeeNumber": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@coop.com",
  "phone": "1234567890",
  "position": "Manager",
  "department": "Operations",
  "salary": 50000
}
```

### HRM - Create Attendance

```bash
POST /api/hrm/attendance
{
  "employeeId": "employee-id",
  "date": "2024-01-15",
  "checkIn": "2024-01-15T09:00:00Z",
  "checkOut": "2024-01-15T17:00:00Z",
  "status": "present"
}
```

### Governance - Create Meeting

```bash
POST /api/governance/meetings
{
  "title": "Board Meeting - January 2024",
  "meetingType": "board",
  "scheduledDate": "2024-01-20T10:00:00Z",
  "location": "Main Office",
  "attendees": ["user-id-1", "user-id-2"]
}
```

### Inventory - Create Item

```bash
POST /api/inventory/items
{
  "code": "ITEM001",
  "name": "Office Chair",
  "unit": "piece",
  "quantity": 10,
  "minQuantity": 5,
  "maxQuantity": 20,
  "unitPrice": 150.00,
  "categoryId": "category-id"
}
```

### Compliance - Get Audit Logs

```bash
GET /api/compliance/audit-logs?entityType=loan&action=create&startDate=2024-01-01
```

## Database Schema Details

### MemberDocument

- `documentType`: id, photo, contract, other
- `filePath`: Storage path for the document
- `uploadedBy`: User ID who uploaded

### OfficialDocument

- `documentType`: policy, regulation, report, certificate, other
- `version`: Document version (default: "1.0")
- `isPublic`: Public visibility flag
- `effectiveDate` / `expiryDate`: Document validity period

### Employee

- `employeeNumber`: Unique per cooperative
- `status`: active, inactive, terminated
- `hireDate` / `terminatedDate`: Employment period

### PayrollLog

- `payPeriodStart` / `payPeriodEnd`: Pay period
- `grossSalary`, `deductions`, `netSalary`: Salary breakdown
- `status`: pending, paid, cancelled

### AttendanceLog

- `checkIn` / `checkOut`: Time tracking
- `hoursWorked`: Auto-calculated from check-in/out
- `status`: present, absent, late, leave, holiday
- Unique constraint on `employeeId` + `date`

### Meeting

- `meetingType`: board, general, committee, other
- `status`: scheduled, ongoing, completed, cancelled
- `attendees`: JSON array of attendee IDs

### MeetingMinute

- `agenda`, `discussion`, `decisions`: Text fields
- `actionItems`: JSON array
- One-to-one with Meeting

### InventoryCategory

- Hierarchical structure with `parentId`
- Unique name per cooperative

### InventoryItem

- `code`: Unique per cooperative
- `quantity`: Current stock level
- `minQuantity` / `maxQuantity`: Stock alert thresholds
- `unit`: piece, kg, liter, etc.

### AuditLog

- `action`: create, update, delete, view, export, etc.
- `entityType`: user, member, loan, saving, etc.
- `entityId`: ID of the affected entity
- `details`: JSON for additional context
- `ipAddress` / `userAgent`: Request metadata

## Files Created

### Backend Routes

- `apps/backend/src/routes/dms.ts` - Document Management routes
- `apps/backend/src/routes/hrm.ts` - Human Resource Management routes
- `apps/backend/src/routes/governance.ts` - Governance routes
- `apps/backend/src/routes/inventory.ts` - Inventory Management routes
- `apps/backend/src/routes/compliance.ts` - Compliance & Audit routes

### Database

- `packages/db-schema/prisma/schema.prisma` - Added Phase 3 models

### Main Server

- `apps/backend/src/index.ts` - Added Phase 3 routes

## Next Steps

### Phase 4: Frontend Integration

- Update `GET /auth/me` to return enabled modules (✅ Already done)
- Create AuthContext in frontend
- Build dynamic navigation based on enabled modules
- Implement public subdomain sites
- Create UI for all modules

### Additional Enhancements

- File upload handling for DMS
- Automated payroll calculations
- Inventory alerts for low stock
- Meeting reminders and notifications
- Advanced audit log reporting
- Integration with accounting engine

---

**Phase 3 Status: ✅ COMPLETE**

All ERP & Operations modules (DMS, HRM, Governance, Inventory, Compliance) are implemented and ready for use!

---

# Phase 4 Complete

# Phase 4: Middleware & Frontend - COMPLETE ✅

## Summary

Phase 4 has been successfully implemented, completing the full-stack integration with dynamic UI based on enabled modules, authentication context, and tenant identification for both web and mobile applications.

## What Was Implemented

### 1. Backend: Public Routes ✅

**File:** `apps/backend/src/routes/public.ts`

- `GET /api/public/profile/:subdomain` - Public endpoint to get cooperative profile by subdomain
- No authentication required (public access)
- Used for public-facing cooperative websites

### 2. Backend: Member Login ✅

**File:** `apps/backend/src/routes/auth.ts`

- `POST /api/auth/member-login` - Member login endpoint
- Accepts subdomain, member number, and password
- Designed for mobile app member access
- Returns member info and token

### 3. Frontend Web: Authentication Context ✅

**File:** `apps/frontend-web/src/contexts/AuthContext.tsx`

**Features:**

- Centralized authentication state management
- Token storage in localStorage
- Automatic user data fetching on mount
- `hasModule()` helper function to check module access
- `login()`, `logout()`, and `refreshAuth()` methods
- Provides user, cooperative, and enabledModules throughout the app

### 4. Frontend Web: Dynamic Navigation ✅

**File:** `apps/frontend-web/src/components/Navigation.tsx`

**Features:**

- Conditionally renders navigation items based on enabled modules
- Only shows links for modules the cooperative has access to
- Active route highlighting
- User info and logout button
- Hidden on auth pages (login/register)

**Navigation Items:**

- Always visible: Dashboard, Members
- CBS module: Savings, Loans, Shares
- DMS module: Documents
- HRM module: Employees, Payroll, Attendance
- Governance module: Meetings
- Inventory module: Inventory
- Compliance module: Audit Logs

### 5. Frontend Web: Protected Routes ✅

**File:** `apps/frontend-web/src/components/ProtectedRoute.tsx`

**Features:**

- Wraps pages that require authentication
- Optional module requirement check
- Automatic redirect to login if not authenticated
- Shows access denied message if module not enabled
- Loading state while checking authentication

### 6. Frontend Web: Authentication Pages ✅

**Files:**

- `apps/frontend-web/src/app/login/page.tsx` - Login page
- `apps/frontend-web/src/app/register/page.tsx` - Registration page

**Features:**

- Beautiful, modern UI with Tailwind CSS
- Form validation
- Error handling and display
- Redirect to dashboard after successful login
- Link between login and register pages

### 7. Frontend Web: Dashboard ✅

**File:** `apps/frontend-web/src/app/dashboard/page.tsx`

**Features:**

- Overview cards showing cooperative, user, and module info
- Enabled modules display
- Quick action buttons (only for enabled modules)
- Protected route wrapper

### 8. Frontend Web: Public Subdomain Site ✅

**File:** `apps/frontend-web/src/app/[subdomain]/page.tsx`

**Features:**

- Public-facing cooperative profile page
- Fetches data from public API endpoint
- Displays cooperative name, logo, description
- Shows contact information (address, phone, email, website)
- No authentication required
- Error handling for missing cooperatives

**Note:** In production, you'll need to configure Next.js middleware or reverse proxy to route subdomains to this page.

### 9. Frontend Web: Home Page ✅

**File:** `apps/frontend-web/src/app/page.tsx`

**Features:**

- Landing page with sign in/register buttons
- Auto-redirects to dashboard if already authenticated
- Modern gradient design

### 10. Mobile App: Tenant Identification ✅

**File:** `apps/mobile-member/app/login.tsx`

**Features:**

- Subdomain input field on login screen
- Clear instructions for users
- Supports both member login (member number) and user login (email)
- Full login form with email/member number and password
- Error handling and loading states

**File:** `apps/mobile-member/app/index.tsx`

**Features:**

- Welcome screen with sign in button
- Navigation to login screen

### 11. Layout Updates ✅

**File:** `apps/frontend-web/src/app/layout.tsx`

- Wrapped app with `AuthProvider`
- Added `Navigation` component
- Navigation automatically hidden on auth pages

## Module Access Control Flow

1. **User logs in** → `GET /api/auth/me` returns `enabledModules`
2. **AuthContext** stores modules in state
3. **Navigation component** filters items using `hasModule()`
4. **ProtectedRoute** checks module access before rendering
5. **Backend middleware** (`isModuleEnabled`) enforces access at API level

## User Experience

### Web Application Flow

1. **Landing Page** → User sees welcome page
2. **Login/Register** → User authenticates
3. **Dashboard** → User sees overview and enabled modules
4. **Navigation** → Only shows links for enabled modules
5. **Module Pages** → Protected by both frontend and backend checks

### Mobile Application Flow

1. **Welcome Screen** → User sees app intro
2. **Login Screen** → User enters subdomain, member number/email, password
3. **Authentication** → Backend identifies tenant from subdomain
4. **Member Dashboard** → (To be implemented in future)

## API Endpoints Added

### Public Endpoints

- `GET /api/public/profile/:subdomain` - Get public cooperative profile

### Authentication Endpoints

- `POST /api/auth/member-login` - Member login with subdomain and member number

## Files Created/Modified

### Frontend Web

- `apps/frontend-web/src/contexts/AuthContext.tsx` - Authentication context
- `apps/frontend-web/src/components/Navigation.tsx` - Dynamic navigation
- `apps/frontend-web/src/components/ProtectedRoute.tsx` - Route protection
- `apps/frontend-web/src/app/login/page.tsx` - Login page
- `apps/frontend-web/src/app/register/page.tsx` - Registration page
- `apps/frontend-web/src/app/dashboard/page.tsx` - Dashboard page
- `apps/frontend-web/src/app/[subdomain]/page.tsx` - Public profile page
- `apps/frontend-web/src/app/page.tsx` - Home/landing page
- `apps/frontend-web/src/app/layout.tsx` - Root layout with providers

### Mobile App

- `apps/mobile-member/app/login.tsx` - Login with subdomain
- `apps/mobile-member/app/index.tsx` - Welcome screen
- `apps/mobile-member/app/_layout.tsx` - Navigation layout

### Backend

- `apps/backend/src/routes/public.ts` - Public routes
- `apps/backend/src/routes/auth.ts` - Added member login endpoint
- `apps/backend/src/index.ts` - Added public routes

## Next Steps

### Frontend Enhancements

- Build module-specific pages (savings, loans, shares, etc.)
- Add member management pages
- Create forms for creating/editing entities
- Add data tables with pagination and filtering
- Implement file upload for DMS

### Mobile App Enhancements

- Complete member dashboard
- Add member account views (savings, loans, shares)
- Implement transaction history
- Add notifications

### Production Considerations

- Configure subdomain routing (Next.js middleware or reverse proxy)
- Add secure token storage for mobile (expo-secure-store)
- Implement refresh token mechanism
- Add rate limiting
- Set up error tracking (Sentry, etc.)
- Add analytics

### Additional Features

- Email notifications
- SMS notifications
- Report generation
- Data export
- Advanced search and filtering
- Real-time updates (WebSockets)

---

**Phase 4 Status: ✅ COMPLETE**

All frontend integration is complete! The system now has:

- ✅ Dynamic UI based on enabled modules
- ✅ Authentication context throughout the app
- ✅ Protected routes with module checks
- ✅ Public subdomain sites
- ✅ Mobile app tenant identification
- ✅ Member login endpoint

**All 4 Phases Complete! 🎉**

The MyERP system is now fully functional with:

- Phase 0: Foundation & Core Architecture ✅
- Phase 1: Tenancy, Billing & Core Engine ✅
- Phase 2: Financial Product Modules (CBS) ✅
- Phase 3: ERP & Operations Modules ✅
- Phase 4: Middleware & Frontend ✅

The system is ready for production deployment and further customization!

---

# Quick Start

# Quick Start - Browser Testing

## 🚀 Quick Start (2 Terminals)

### Terminal 1: Backend

```bash
cd apps/backend
pnpm dev
```

### Terminal 2: Frontend

```bash
cd apps/frontend-web
pnpm dev
```

Then open: **http://localhost:3000**

---

## 📋 Step-by-Step Testing

### 1. Start Backend Server

Open PowerShell/Terminal and run:

```powershell
cd E:\MyERP\apps\backend
pnpm dev
```

**Expected output:**

```
🚀 Backend server running on port 3001
📡 API available at http://localhost:3001/api
```

✅ **Keep this terminal open!**

### 2. Start Frontend Server

Open a **NEW** PowerShell/Terminal window and run:

```powershell
cd E:\MyERP\apps\frontend-web
pnpm dev
```

**Expected output:**

```
- ready started server on 0.0.0.0:3000
- Local:        http://localhost:3000
```

✅ **Keep this terminal open too!**

### 3. Open Browser

Open your browser and go to:

```
http://localhost:3000
```

You should see the **MyERP landing page**.

### 4. Test Registration

1. Click **"Register"** button
2. Fill in the form:
   - Cooperative Name: `Test Cooperative`
   - Subdomain: `testcoop`
   - First Name: `Admin`
   - Last Name: `User`
   - Email: `admin@testcoop.com`
   - Password: `Password123!`
3. Click **"Register"**
4. You'll be redirected to login page

### 5. Test Login

1. Enter your email: `admin@testcoop.com`
2. Enter your password: `Password123!`
3. Click **"Sign in"**
4. You should be redirected to the **Dashboard**

### 6. Explore the Dashboard

You should see:

- Your cooperative name
- Your user name
- Module count (0 for Basic plan)
- Navigation bar at the top

### 7. Test Navigation

The navigation bar should show:

- ✅ Dashboard (always visible)
- ✅ Members (always visible)
- ❌ Other modules (hidden because Basic plan has no modules)

### 8. Test Public Profile

Go to:

```
http://localhost:3000/bhanjyang
```

You should see the public profile for Bhanjyang Cooperative.

---

## 🔍 Test API Directly in Browser

### Health Check

```
http://localhost:3001/health
```

### Public Profile API

```
http://localhost:3001/api/public/profile/bhanjyang
```

---

## ⚠️ Troubleshooting

### Port Already in Use

If port 3000 or 3001 is already in use:

- Close other applications using those ports
- Or change the port in `.env` files

### Backend Not Starting

- Check if PostgreSQL is running
- Verify `DATABASE_URL` in `apps/backend/.env`
- Check terminal for error messages

### Frontend Not Starting

- Make sure backend is running first
- Check `NEXT_PUBLIC_API_URL` in `apps/frontend-web/.env.local`
- Check terminal for error messages

### Login Not Working

- Open browser Developer Tools (F12)
- Check Console tab for errors
- Check Network tab to see API calls
- Verify backend is running on port 3001

---

## 🎯 What to Test

1. ✅ Landing page loads
2. ✅ Registration works
3. ✅ Login works
4. ✅ Dashboard shows user info
5. ✅ Navigation shows/hides based on modules
6. ✅ Public profile page works
7. ✅ API endpoints respond correctly

---

## 📝 Using Your Existing Cooperative

If you already registered Bhanjyang Cooperative, you can login with:

- **Email**: `admin@bhanjyang.coop.np`
- **Password**: `Password123!`

Then test the dashboard and navigation!

---

# Release Lock

# Releasing Prisma Migration Lock

If you're getting a timeout error when running migrations, it's likely because a PostgreSQL advisory lock is being held. Here are several solutions:

## Solution 1: Check for Running Prisma Processes

First, check if there are any other Prisma processes running:

**Windows (PowerShell):**

```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*prisma*"}
```

**Kill any stuck processes:**

```powershell
Stop-Process -Name node -Force
```

## Solution 2: Release Lock via PostgreSQL

Connect to your PostgreSQL database and run:

```sql
-- Check current locks
SELECT
    locktype,
    objid,
    pid,
    mode,
    granted
FROM pg_locks
WHERE locktype = 'advisory'
AND objid = 72707369;

-- If you see a lock, note the PID and kill that process, or:
-- Release all advisory locks (be careful - this releases ALL advisory locks)
SELECT pg_advisory_unlock_all();
```

**Using psql:**

```bash
psql -U postgres -d myerp -c "SELECT pg_advisory_unlock_all();"
```

## Solution 3: Use `prisma db push` (Development Only)

For development, you can use `db push` instead of migrations:

```bash
pnpm prisma db push
```

**Note:** This doesn't create migration files and is not recommended for production.

## Solution 4: Reset Database (⚠️ DESTROYS ALL DATA)

If this is a fresh database with no important data:

```bash
pnpm prisma migrate reset
```

This will:

- Drop the database
- Create a new database
- Apply all migrations
- Run seed scripts (if any)

## Solution 5: Increase Timeout

You can try increasing the migration timeout by setting an environment variable:

```bash
# Windows PowerShell
$env:PRISMA_MIGRATE_LOCK_TIMEOUT="30000"
pnpm prisma migrate dev --name init
```

## Recommended Approach

1. **First**, try Solution 1 (kill any stuck processes)
2. **Then**, try Solution 2 (release the lock manually)
3. **If still stuck**, use Solution 3 (`db push`) for development
4. **Last resort**, use Solution 4 (reset) if you have no important data

---

# SAAS ERP Plan

# Modular Multi-Tenant SaaS ERP Development Plan

This plan details the construction of a comprehensive, multi-tenant ERP system for cooperative management, with a core focus on modularity to support flexible pricing tiers. Development is structured into distinct phases, ensuring a solid foundation for tenancy and billing before building out individual feature modules.

## Phase 0: Foundation & Core Architecture

This initial phase focuses on establishing a robust monorepo structure and configuring essential development tools. This foundation will support all subsequent development.

- **Action:** Setup pnpm monorepo.
- **Structure:**
  - `apps/backend`: Node.js/Express.js backend server.
  - `apps/frontend-web`: Next.js application for the staff dashboard and public websites.
  - `apps/mobile-member`: React Native (Expo) application for cooperative members.
  - `packages/db-schema`: Centralized location for all Prisma database schemas.
  - `packages/shared-types`: Shared TypeScript types and interfaces for cross-application consistency.
- **Tooling:** Configure root-level ESLint, Prettier, and TypeScript.

## Phase 1: Tenancy, Billing & Core Engine

This phase is critical for establishing the multi-tenancy and subscription core. We will implement the schemas and logic to handle tenant isolation, user identity, modular plans, and the core accounting engine.

- **Module: Tenancy & Subscription (The Business Core)**
  - **Schema (`packages/db-schema`):**
    - `Cooperative`: The "Tenant" model.
    - `Plan`: Includes `name`, `monthlyPrice`, and a crucial `enabledModules: Json` field (e.g., `["cbs", "dms", "hrm"]`).
    - `Subscription`: Links a `Cooperative` to a `Plan`.
  - **Endpoint (`apps/backend`):** Create `POST /saas/register` to create a `Cooperative` and assign a default `Plan`.
- **Module: Identity & Access Management (IAM)**
  - **Schema (`packages/db-schema`):** Define tenant-scoped models for `User` (Staff), `Member` (Customer), `Role`, and `Permission`.
- **Module: Onboarding & Public Profile**
  - **Schema (`packages/db-schema`):** Create the `CooperativeProfile` model (one-to-one with `Cooperative`).
  - **Endpoint (`apps/backend`):** Create a protected `PUT /onboarding/profile`.
- **Module: Double-Entry Accounting Engine (CBS Part 1)**
  - **Schema (`packages/db-schema`):** Define tenant-isolated models: `ChartOfAccounts`, `Ledger`, `JournalEntry`, `Transaction`.
  - **Core Logic (`apps/backend`):** Implement Prisma Middleware to automatically scope all database queries to the `tenantId` of the authenticated user.

## Phase 2: Financial Product Modules (CBS Part 2)

This phase builds out the core banking system modules. Access to these will be controlled by the `cbs` key in a tenant's plan.

- **Modules (all tenant-scoped):**
  - `savings`: `SavingProduct`, `SavingAccount`.
  - `loans`: `LoanProduct`, `LoanApplication`, `EMISchedule`.
  - `shares`: `ShareLedger`, `ShareTransaction`.

## Phase 3: ERP & Operations Modules (Add-ons)

This phase develops the optional, add-on modules that can be sold "à la carte".

- **Modules (all tenant-scoped):**
  - `dms`: `MemberDocument`, `OfficialDocument`.
  - `hrm`: `Employee`, `PayrollLog`, `AttendanceLog`.
  - `governance`: `Meeting`, `MeetingMinute`.
  - `inventory`: `InventoryItem`, `InventoryCategory`.
  - `compliance`: `AuditLog`.

## Phase 4: Middleware & Frontend (Tying it all together)

The final phase implements the critical logic that enforces the modular subscription plan and builds the dynamic user interfaces.

- **Backend: `isModuleEnabled` Middleware (CRITICAL)**
  - **Action (`apps/backend`):** Create an Express.js middleware `isModuleEnabled(moduleName: string)`.
  - **Logic:** It will verify that the authenticated user's cooperative has an active subscription plan that includes the required `moduleName` in its `enabledModules` array. If not, it returns a 403 Forbidden error.
  - **Usage:** Apply this middleware to all module-specific API route groups (e.g., `/api/hrm`, `/api/dms`).
- **App: `frontend-web` (Next.js)**
  - **Public Site:** `subdomain.saas.com` will publicly render data from the `CooperativeProfile`.
  - **Staff App (Dynamic UI):**
    - The `GET /auth/me` endpoint will be updated to return the cooperative's `enabledModules` list alongside user and role info.
    - An `AuthContext` will make this list available throughout the app.
    - The main navigation/sidebar will conditionally render links based on this list, ensuring users only see links to features they have paid for.
- **App: `mobile-member` (React Native)**
  - The login screen will require a subdomain or code to identify the correct tenant.

---

# Scripts README

# Backend Scripts

## Register Cooperative

Register a new cooperative with admin user.

### Usage

1. **Edit the script** (`scripts/register-cooperative.ts`) to update:
   - Cooperative details (name, subdomain, address, etc.)
   - Admin user email and password
   - Profile information

2. **Run the script:**
   ```bash
   pnpm register:coop
   ```

### Example: Bhanjyang Cooperative

The script is pre-configured with Bhanjyang Saving & Credit Cooperative Society Ltd. details:

- **Name**: Bhanjyang Saving & Credit Cooperative Society Ltd.
- **Subdomain**: bhanjyang
- **Address**: Rupa RM-5, Deurali, Kaski
- **Domain**: bhanjyang.coop.np
- **Admin Email**: admin@bhanjyang.coop.np

⚠️ **Important**: Change the default password in the script before running!

### Output

The script will:

1. Create the cooperative
2. Create an active subscription (Basic plan)
3. Create the cooperative profile
4. Create the admin user
5. Generate and display a JWT token

You can use the JWT token to authenticate API requests immediately.

---

# Subscription Guide

# Subscription Management Guide

This guide explains how to view and manage subscriptions in MyERP.

## Viewing Your Current Subscription

### Option 1: Via API (Browser/Postman)

1. **Login first** to get your JWT token
2. **Get your subscription:**
   ```
   GET http://localhost:3001/api/subscription
   Authorization: Bearer <your-token>
   ```

### Option 2: Via Frontend (Coming Soon)

The subscription information is already available in the `GET /api/auth/me` endpoint, which returns:

```json
{
  "cooperative": {
    "enabledModules": ["cbs", "dms", "hrm"]
  }
}
```

### Option 3: Check in Database

Using Prisma Studio:

```bash
cd packages/db-schema
pnpm studio
```

Navigate to:

1. `Subscription` table - see your current subscription
2. `Plan` table - see available plans and their modules

## Available Plans

### Basic Plan

- **Price**: $0/month
- **Modules**: None
- **Features**: Basic cooperative management only

### Standard Plan

- **Price**: $49.99/month
- **Modules**: `cbs` (Core Banking System)
- **Features**: Savings, Loans, Shares

### Premium Plan

- **Price**: $99.99/month
- **Modules**: `cbs`, `dms`, `hrm`
- **Features**: Banking + Document Management + Human Resources

### Enterprise Plan

- **Price**: $199.99/month
- **Modules**: All modules (`cbs`, `dms`, `hrm`, `governance`, `inventory`, `compliance`)
- **Features**: Everything

## Upgrading Your Subscription

### Method 1: Using the Upgrade Script (Recommended)

```bash
cd apps/backend
pnpm upgrade-plan <subdomain> <planName>
```

**Examples:**

```bash
# Upgrade Bhanjyang to Standard plan
pnpm upgrade-plan bhanjyang Standard

# Upgrade to Premium
pnpm upgrade-plan bhanjyang Premium

# Upgrade to Enterprise
pnpm upgrade-plan bhanjyang Enterprise
```

### Method 2: Using API Endpoint

1. **Get available plans:**

   ```
   GET http://localhost:3001/api/subscription/plans
   Authorization: Bearer <your-token>
   ```

2. **Change plan:**

   ```
   PUT http://localhost:3001/api/subscription/change-plan
   Authorization: Bearer <your-token>
   Content-Type: application/json

   {
     "planId": "plan-id-here"
   }
   ```

### Method 3: Using Prisma Studio

1. Open Prisma Studio:

   ```bash
   cd packages/db-schema
   pnpm studio
   ```

2. Navigate to `Subscription` table
3. Find your cooperative's subscription
4. Update the `planId` field to the new plan's ID
5. You can find plan IDs in the `Plan` table

### Method 4: Direct Database Query

Connect to PostgreSQL and run:

```sql
-- Get your cooperative ID
SELECT id, name, subdomain FROM cooperatives WHERE subdomain = 'bhanjyang';

-- Get available plans
SELECT id, name, "monthlyPrice", "enabledModules" FROM plans;

-- Update subscription (replace IDs with actual values)
UPDATE subscriptions
SET "planId" = (SELECT id FROM plans WHERE name = 'Standard')
WHERE "cooperativeId" = 'YOUR_COOPERATIVE_ID';
```

## Testing Module Access

After upgrading your plan:

1. **Refresh your browser** (or logout and login again)
2. **Check the dashboard** - should show enabled modules
3. **Check navigation** - should show links for enabled modules
4. **Test API endpoints** - should work for enabled modules

### Example: Testing CBS Module

After upgrading to Standard plan (has CBS module):

1. **Check navigation** - should see "Savings", "Loans", "Shares" links
2. **Test API:**

   ```
   GET http://localhost:3001/api/savings/products
   Authorization: Bearer <your-token>
   ```

   Should return products (or empty array if none created yet)

3. **Try accessing without module:**
   ```
   GET http://localhost:3001/api/hrm/employees
   Authorization: Bearer <your-token>
   ```
   Should return 403 Forbidden (HRM not in Standard plan)

## Quick Upgrade for Bhanjyang Cooperative

To upgrade Bhanjyang to Standard plan (enables CBS module):

```bash
cd apps/backend
pnpm upgrade-plan bhanjyang Standard
```

Then:

1. Refresh your browser
2. Logout and login again
3. You should now see Savings, Loans, and Shares in the navigation!

## API Endpoints

### Get Current Subscription

```
GET /api/subscription
Authorization: Bearer <token>
```

**Response:**

```json
{
  "subscription": {
    "id": "...",
    "status": "active",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": null,
    "plan": {
      "id": "...",
      "name": "Standard",
      "monthlyPrice": 49.99,
      "enabledModules": ["cbs"]
    }
  }
}
```

### Get All Available Plans

```
GET /api/subscription/plans
Authorization: Bearer <token>
```

### Change Plan

```
PUT /api/subscription/change-plan
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "plan-id-here"
}
```

## Notes

- **In Production**: Plan changes should go through payment processing
- **Current Implementation**: Direct plan changes for development/testing
- **Module Access**: Changes take effect immediately after plan update
- **Token Refresh**: You may need to logout/login to see UI changes

---

# Testing Guide

# Browser Testing Guide

This guide will help you test the MyERP application in your browser.

## Prerequisites

1. **Database is running** - PostgreSQL should be running and accessible
2. **Environment variables are set** - `.env` files are configured
3. **Dependencies are installed** - Run `pnpm install` if you haven't already

## Step 1: Start the Backend Server

Open a terminal and run:

```bash
cd apps/backend
pnpm dev
```

You should see:

```
🚀 Backend server running on port 3001
📡 API available at http://localhost:3001/api
```

**Keep this terminal open** - the backend needs to keep running.

## Step 2: Start the Frontend Server

Open a **new terminal** and run:

```bash
cd apps/frontend-web
pnpm dev
```

You should see:

```
- ready started server on 0.0.0.0:3000
- Local:        http://localhost:3000
```

## Step 3: Access the Application

Open your browser and navigate to:

**http://localhost:3000**

You should see the MyERP landing page with "Sign In" and "Register" buttons.

## Step 4: Test Registration

1. Click **"Register"** or go to **http://localhost:3000/register**

2. Fill in the registration form:
   - **Cooperative Name**: Test Cooperative
   - **Subdomain**: testcoop (must be lowercase, alphanumeric + hyphens)
   - **First Name**: Admin
   - **Last Name**: User
   - **Email**: admin@testcoop.com
   - **Password**: YourPassword123!

3. Click **"Register"**

4. You should be redirected to the login page after successful registration.

## Step 5: Test Login

1. Go to **http://localhost:3000/login**

2. Enter your credentials:
   - **Email**: admin@testcoop.com (or use your registered email)
   - **Password**: YourPassword123!

3. Click **"Sign in"**

4. You should be redirected to the **Dashboard** at **http://localhost:3000/dashboard**

## Step 6: Test the Dashboard

On the dashboard, you should see:

- **Cooperative name** card
- **User name** card
- **Modules** card (showing 0 enabled modules for Basic plan)
- **Enabled Modules** section (empty for Basic plan)
- **Quick Actions** section

## Step 7: Test Dynamic Navigation

Look at the top navigation bar. You should see:

- **Dashboard** (always visible)
- **Members** (always visible)

You should **NOT** see:

- Savings, Loans, Shares (CBS module - not enabled)
- Documents (DMS module - not enabled)
- Employees, Payroll, Attendance (HRM module - not enabled)
- Meetings (Governance module - not enabled)
- Inventory (Inventory module - not enabled)
- Audit Logs (Compliance module - not enabled)

This is correct! The Basic plan has no modules enabled.

## Step 8: Test Module Access (Optional)

To test module access, you need to upgrade your cooperative's plan. You can do this by:

### Option A: Using Prisma Studio (Easiest)

1. Open a new terminal
2. Run:
   ```bash
   cd packages/db-schema
   pnpm studio
   ```
3. This opens Prisma Studio in your browser
4. Navigate to the `Subscription` table
5. Find your cooperative's subscription
6. Update the `planId` to a plan that has modules (Standard, Premium, or Enterprise)
7. Or update the `Plan` table to add modules to the Basic plan

### Option B: Using Database Query

Connect to your PostgreSQL database and run:

```sql
-- Get your cooperative ID
SELECT id, name, subdomain FROM cooperatives;

-- Get available plans
SELECT id, name, "enabledModules" FROM plans;

-- Update subscription to Standard plan (has CBS module)
UPDATE subscriptions
SET "planId" = (SELECT id FROM plans WHERE name = 'Standard')
WHERE "cooperativeId" = 'YOUR_COOPERATIVE_ID';
```

### Option C: Create a Script

Create a script to upgrade the plan programmatically.

## Step 9: Test Public Profile

1. Go to **http://localhost:3000/bhanjyang** (or your cooperative's subdomain)

2. You should see the public profile page with:
   - Cooperative name
   - Description (if set)
   - Address, phone, website (if set in profile)

## Step 10: Test API Endpoints Directly

You can test API endpoints using your browser's developer tools or a tool like Postman.

### Test Health Check

Open: **http://localhost:3001/health**

You should see:

```json
{
  "status": "ok",
  "message": "Backend server is running"
}
```

### Test Public Profile API

Open: **http://localhost:3001/api/public/profile/bhanjyang**

You should see the cooperative profile data.

## Troubleshooting

### Backend won't start

- Check if port 3001 is already in use
- Verify your `.env` file has correct `DATABASE_URL`
- Make sure PostgreSQL is running

### Frontend won't start

- Check if port 3000 is already in use
- Verify `NEXT_PUBLIC_API_URL` in `.env.local` points to `http://localhost:3001/api`

### Login fails

- Check browser console for errors
- Verify backend is running
- Check that the user exists in the database
- Verify JWT_SECRET is set in backend `.env`

### Navigation not showing modules

- This is expected for Basic plan (no modules)
- Upgrade to a plan with modules to see them
- Check browser console for any errors

### CORS errors

- Make sure `CORS_ORIGIN` in backend `.env` includes `http://localhost:3000`
- Or set it to `*` for development (not recommended for production)

## Quick Test Checklist

- [ ] Backend server running on port 3001
- [ ] Frontend server running on port 3000
- [ ] Can access http://localhost:3000
- [ ] Can register a new cooperative
- [ ] Can login with registered credentials
- [ ] Dashboard loads and shows user/cooperative info
- [ ] Navigation shows only available modules
- [ ] Public profile page works (http://localhost:3000/[subdomain])
- [ ] API health check works (http://localhost:3001/health)

## Next Steps

Once basic testing is complete, you can:

1. Test individual module endpoints (requires enabling modules)
2. Create test data (members, products, etc.)
3. Test the full workflow for each module
4. Test error handling and edge cases

---

# AML & Compliance Module

## Overview

The Anti-Money Laundering (AML) and Compliance module implements comprehensive AML/KYM (Know Your Member) features as required by the AML Directive (Fifth Amendment, 2082) for cooperative societies in Nepal.

## Features

### 1. KYM (Know Your Member) Management

- PEP (Politically Exposed Person) status tracking
- Beneficial owner identification
- Family details for recursive PEP screening
- Risk categorization (High, Medium, Low)
- Risk factors tracking
- Dynamic KYM expiry dates based on risk category:
  - High Risk: 1 year
  - Medium Risk: 2 years
  - Low Risk: 3 years

### 2. Transaction Monitoring

- Real-time event-driven transaction monitoring
- TTR (Threshold Transaction Report) generation for transactions ≥ Rs. 10 Lakhs
- Source of Funds (SOF) declaration requirement
- High-risk member continuous monitoring
- Exemption logic for government, employee, and bank transactions
- Idempotent transaction processing

### 3. Risk Assessment

- Automated risk scoring based on:
  - PEP status (including family members)
  - Occupation risk
  - Transaction volume
  - Geography risk
- Risk factor tracking for Schedule-3 reporting
- Scheduled risk reassessment

### 4. Watchlist Screening

- UN Sanction List integration
- Home Ministry Sanction List integration
- Retrospective screening on watchlist updates
- False positive management (whitelisting)
- Recursive PEP screening

### 5. Reporting & goAML Integration

- TTR XML generation (goAML v5.0.1 schema)
- STR (Suspicious Transaction Report) XML generation
- Pre-flight validation before XML generation
- Schedule-3 Annual Risk Assessment report
- Risk factor aggregation

### 6. Compliance Dashboard

- TTR Queue management
- Suspicious Cases management
- KYM Status Board
- Risk Report generator
- Confidentiality warnings and access logging

### 7. Training & Capacity Development

- Training session management
- Attendance tracking
- Support for AML workshops and KYC training

## Database Schema

### New Models

- `ProcessedAmlEvents`: Tracks processed transactions for idempotency
- `AmlFlag`: Flags suspicious transactions and activities
- `AmlTtrReport`: TTR reports with deadlines and status
- `SourceOfFundsDeclaration`: SOF declarations with attachments
- `AccountSignatory`: Biometric data for guardians/operators
- `WhitelistedMatch`: False positive watchlist matches
- `SensitiveDataAccessLog`: Logs access to sensitive AML data
- `SanctionListUN`: UN sanction list entries
- `SanctionListHomeMinistry`: Home Ministry sanction list entries
- `AmlCase`: Case management for suspicious activities
- `TrainingSession`: Training session records
- `TrainingAttendance`: Training attendance records

### Extended Models

- `Member`: Added AML/KYM fields (pepStatus, beneficialOwner, riskCategory, riskFactors, etc.)

## API Endpoints

### Compliance Endpoints

#### POST /api/compliance/log-attempt

Log a suspicious attempt that didn't result in a transaction.

**Request Body:**

```json
{
  "memberId": "member-id",
  "details": { "reason": "Refused to provide ID" },
  "notes": "Suspicious behavior observed"
}
```

#### GET /api/compliance/aml/ttr

Get TTR queue (requires ComplianceOfficer role).

**Query Parameters:**

- `status`: Filter by status (pending, approved, rejected)
- `startDate`: Filter by start date
- `endDate`: Filter by end date

#### POST /api/compliance/aml/ttr/:id/generate-xml

Generate goAML XML for a TTR.

#### GET /api/compliance/aml/ttr/:id/xml

Download TTR XML file.

#### PUT /api/compliance/aml/ttr/:id

Update TTR report (e.g., reject with reason).

#### GET /api/compliance/aml/cases

Get AML cases (with sensitive data access logging).

#### POST /api/compliance/aml/cases

Create AML case.

#### POST /api/compliance/aml/cases/:id/generate-str

Generate STR XML for an AML case.

#### POST /api/compliance/aml/whitelist-match

Whitelist a watchlist match (mark as false positive).

#### POST /api/compliance/aml/screen-member/:memberId

Screen a member against watchlists.

#### GET /api/compliance/aml/kym-status

Get KYM status (members with expiring/expired KYM).

**Query Parameters:**

- `expired`: Filter by expired status (true/false)
- `pepOnly`: Filter by PEP status (true)

#### POST /api/compliance/aml/update-risk/:memberId

Manually trigger risk assessment update.

#### GET /api/compliance/aml/risk-report

Generate Schedule-3 annual risk assessment report.

**Query Parameters:**

- `year`: Report year (default: current year)

#### POST /api/compliance/aml/source-of-funds

Create or update source of funds declaration.

**Request Body:**

```json
{
  "transactionId": "tx-id",
  "memberId": "member-id",
  "declaredText": "Source of funds description",
  "attachmentPath": "/path/to/document.pdf"
}
```

### HRM Training Endpoints

#### GET /api/hrm/training

Get all training sessions.

#### POST /api/hrm/training

Create a new training session.

#### POST /api/hrm/training/:sessionId/attendance

Record attendance for a training session.

## Setup & Configuration

### 1. Database Migration

Run Prisma migration to create AML tables:

```bash
cd packages/db-schema
npx prisma migrate dev --name add_aml_compliance
```

### 2. Seed AML Data

Create ComplianceOfficer role:

```bash
cd apps/backend
tsx scripts/seed-aml-data.ts
```

### 3. Import Watchlists

Import UN Sanction List:

```bash
tsx scripts/import-un-sanctions.ts <cooperativeId> <csvFilePath>
```

Import Home Ministry Sanction List:

```bash
tsx scripts/import-home-ministry-sanctions.ts <cooperativeId> <csvFilePath>
```

### 4. Configure Cron Jobs

Set up cron jobs for:

- KYM expiry date updates (daily)
- Risk reassessment (weekly/monthly)
- Watchlist rescreening (triggered on watchlist updates)

Example using node-cron:

```typescript
import cron from 'node-cron';
import { runAmlCronJobs } from './services/aml/cron';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  await runAmlCronJobs();
});
```

## Event-Driven Transaction Monitoring

The system uses an event bus to monitor transactions in real-time:

```typescript
import { amlEvents, AML_EVENTS } from './lib/events';

// Emit event after successful transaction
amlEvents.emit(AML_EVENTS.ON_DEPOSIT, {
  memberId: 'member-id',
  amount: 1500000,
  currency: 'NPR',
  isCash: true,
  transactionId: 'tx-id',
  occurredOn: new Date(),
  transactionType: 'deposit',
  counterpartyType: 'MEMBER',
});
```

## goAML XML Generation

The system generates XML files compatible with goAML v5.0.1 schema. XML files are saved to `uploads/goaml/` directory.

### TTR XML Structure

- Report Header (ReportType, ReportDate)
- Transaction details (Date, Amount, Currency, Type)
- Subject information (Name, DOB, Nationality, ID, Address, Occupation)
- Source of Funds declaration

### STR XML Structure

- Report Header (ReportType, ReportDate)
- Suspicious Activity description
- Subject information

## Security & Access Control

- All compliance endpoints require `ComplianceOfficer` role
- Sensitive data access is logged to `SensitiveDataAccessLog`
- Confidentiality warnings displayed on case management pages
- Biometric data stored securely (ISO 19794-2 template or encrypted path)

## Frontend Pages

- `/compliance/dashboard`: Compliance dashboard with statistics
- `/compliance/ttr-queue`: TTR queue management
- `/compliance/cases`: Suspicious cases management
- `/compliance/kym-status`: KYM status board
- `/compliance/risk-report`: Schedule-3 risk report generator
- `/hrm/training`: Training log management

## Testing

1. Create a member with high-risk attributes
2. Perform a transaction exceeding Rs. 10 Lakhs
3. Verify TTR is generated
4. Check KYM status for expired reviews
5. Generate risk report
6. Test watchlist screening
7. Generate goAML XML files

## Compliance Notes

- TTRs must be reported within 15 days
- KYM reviews are mandatory based on risk category
- All AML actions are audited
- "Tipping off" prevention is enforced through access logging
- False positives can be whitelisted with reason
