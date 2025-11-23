# MyERP - Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend Documentation](#backend-documentation)
4. [Frontend Documentation](#frontend-documentation)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [Authentication & Authorization](#authentication--authorization)
8. [Development Guide](#development-guide)

---

## Overview

**MyERP** is a comprehensive, modular, multi-tenant SaaS ERP system designed specifically for cooperative societies. The system provides end-to-end management capabilities including financial operations, member management, compliance, human resources, and governance.

### Key Characteristics
- **Multi-Tenant Architecture**: Subdomain-based tenant isolation
- **Modular Design**: Feature-based module system with subscription-based access control
- **Type-Safe**: Full TypeScript implementation across frontend and backend
- **Monorepo Structure**: pnpm workspace for code sharing and maintainability
- **RESTful API**: Express.js backend with Next.js frontend

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MyERP System                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Frontend    │    │   Backend    │    │   Mobile     │  │
│  │  (Next.js)   │◄───┤  (Express)   │───►│   (Expo)     │  │
│  │              │    │              │    │              │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘  │
│         │                   │                                │
│         │                   │                                │
│         └───────────┬───────┘                                │
│                     │                                        │
│              ┌──────▼───────┐                                │
│              │   PostgreSQL  │                                │
│              │   Database    │                                │
│              └───────────────┘                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
MyERP/
├── apps/
│   ├── backend/              # Express.js API server
│   ├── frontend-web/         # Next.js web application
│   └── mobile-member/        # React Native mobile app
├── packages/
│   ├── db-schema/            # Shared Prisma schema
│   └── shared-types/         # Shared TypeScript types
└── docs/                     # Documentation
```

---

## Backend Documentation

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js (>=18.0.0) |
| **Language** | TypeScript |
| **Framework** | Express.js 4.18.2 |
| **Database** | PostgreSQL |
| **ORM** | Prisma 6.19.0 |
| **Authentication** | JWT (jsonwebtoken) + bcryptjs |
| **File Upload** | Multer 2.0.2 |
| **Caching** | node-cache 5.1.2 |
| **Testing** | Vitest 1.2.0 |
| **Package Manager** | pnpm 8.15.0 |

### Project Structure

```
apps/backend/
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── AccountingController.ts
│   │   ├── BaseController.ts
│   │   ├── LoansController.ts
│   │   └── SavingsController.ts
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts           # JWT authentication
│   │   ├── role.ts           # Role-based access control
│   │   ├── tenant.ts         # Tenant isolation
│   │   └── module.ts         # Module access control
│   ├── routes/               # API route definitions
│   │   ├── auth.ts
│   │   ├── members.ts
│   │   ├── savings.ts
│   │   ├── loans.ts
│   │   ├── accounting.ts
│   │   ├── hrm.ts
│   │   ├── governance.ts
│   │   ├── compliance.ts
│   │   └── ...
│   ├── services/             # Business logic layer
│   │   ├── accounting.ts
│   │   ├── aml/              # Anti-Money Laundering
│   │   ├── hrm/              # Human Resources
│   │   └── ...
│   ├── hooks/                # Event hooks system
│   │   ├── accounting-hooks.ts
│   │   ├── loans-hooks.ts
│   │   └── savings-hooks.ts
│   ├── lib/                  # Utility libraries
│   │   ├── auth.ts           # JWT utilities
│   │   ├── prisma.ts         # Prisma client
│   │   ├── cache.ts          # Caching utilities
│   │   ├── workflow-engine.ts
│   │   └── ...
│   └── index.ts              # Application entry point
└── scripts/                  # Utility scripts
```

### Core Features

#### 1. Multi-Tenancy
- **Subdomain-based isolation**: Each cooperative has a unique subdomain
- **Tenant middleware**: Automatic tenant context injection
- **Data isolation**: All queries scoped to tenant ID

#### 2. Module System
- **Subscription-based modules**: Features enabled per subscription plan
- **Module middleware**: `isModuleEnabled()` checks subscription access
- **Dynamic feature access**: Modules can be enabled/disabled per tenant

#### 3. Authentication & Authorization
- **JWT-based authentication**: Token-based stateless auth
- **Role-based access control (RBAC)**: Role-based permissions
- **Module-level permissions**: Feature access based on subscription
- **Sensitive data logging**: Audit trail for sensitive data access

#### 4. Financial Management
- **Core Banking System (CBS)**:
  - Savings accounts and products
  - Loan products and applications
  - EMI scheduling and calculations
  - Share accounts and transactions
- **Accounting System**:
  - Chart of accounts
  - Journal entries
  - General ledger
  - Financial statements
  - Double-entry bookkeeping

#### 5. Compliance & AML
- **Anti-Money Laundering (AML)**:
  - Automated transaction monitoring
  - Sanctions list checking (UN, Home Ministry)
  - Risk assessment and scoring
  - Suspicious transaction reporting (STR)
  - Threshold transaction reporting (TTR)
  - Case management
- **KYC Management**:
  - Member KYC (Know Your Member)
  - Institution KYC
  - Document verification
  - Source of funds declarations

#### 6. Human Resource Management (HRM)
- **Employee Management**:
  - Employee records
  - Departments and designations
  - Shift management
- **Payroll**:
  - Payroll calculations
  - SSF (Social Security Fund) support
  - Traditional payroll schemes
  - Payroll runs and history
- **Attendance & Leave**:
  - Attendance tracking
  - Leave types and requests
  - Leave balance management

#### 7. Governance
- **Meetings Management**:
  - Board meetings
  - Committee meetings
  - Meeting minutes
  - Decision tracking
- **AGM (Annual General Meeting)**:
  - AGM planning and scheduling
  - Agenda management
  - Attendance tracking
- **Committees**:
  - Committee creation and management
  - Member assignments
  - Committee types (BOD, Account, Loan, Education)

#### 8. Document Management System (DMS)
- **Member Documents**: KYC documents, certificates
- **Official Documents**: Meeting minutes, reports
- **File Upload**: Multer-based file handling
- **Document Storage**: Organized file structure

#### 9. Workflow Engine
- **Customizable Workflows**: Configurable approval processes
- **Member Onboarding**: Multi-step member registration
- **Workflow History**: Complete audit trail
- **Status Tracking**: Workflow state management

#### 10. Reporting System
- **Financial Reports**: Balance sheets, income statements
- **Member Reports**: Member statistics and analytics
- **Loan Reports**: Loan portfolio analysis
- **Savings Reports**: Savings account summaries
- **Audit Reports**: System activity logs
- **Compliance Reports**: AML and risk reports

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

#### SaaS & Subscription
- `POST /api/saas/register` - Register new cooperative
- `GET /api/subscription` - Get subscription details
- `PUT /api/subscription/upgrade` - Upgrade subscription plan

#### Members
- `GET /api/members` - List members
- `POST /api/members` - Create member
- `GET /api/members/:id` - Get member details
- `PUT /api/members/:id` - Update member
- `GET /api/members/:id/kyc` - Get member KYC

#### Savings
- `GET /api/savings/products` - List savings products
- `POST /api/savings/products` - Create savings product
- `GET /api/savings/accounts` - List savings accounts
- `POST /api/savings/accounts` - Create savings account
- `POST /api/savings/transactions` - Create transaction

#### Loans
- `GET /api/loans/products` - List loan products
- `POST /api/loans/products` - Create loan product
- `GET /api/loans/applications` - List loan applications
- `POST /api/loans/applications` - Create loan application
- `POST /api/loans/disburse` - Disburse loan

#### Accounting
- `GET /api/accounting/chart-of-accounts` - List accounts
- `POST /api/accounting/journal-entries` - Create journal entry
- `GET /api/accounting/ledger` - Get ledger
- `GET /api/accounting/financial-statements` - Generate statements

#### HRM
- `GET /api/hrm/employees` - List employees
- `POST /api/hrm/employees` - Create employee
- `GET /api/hrm/payroll` - Get payroll data
- `POST /api/hrm/payroll/run` - Run payroll

#### Compliance
- `GET /api/compliance/aml-flags` - List AML flags
- `POST /api/compliance/aml-flags/:id/resolve` - Resolve flag
- `GET /api/compliance/ttr-queue` - Get TTR queue
- `GET /api/compliance/risk-report` - Get risk report

#### Governance
- `GET /api/governance/meetings` - List meetings
- `POST /api/governance/meetings` - Create meeting
- `GET /api/governance/agms` - List AGMs
- `GET /api/governance/committees` - List committees

### Middleware Stack

1. **Authentication Middleware** (`authenticate`)
   - Validates JWT token
   - Attaches user info to request
   - Sets tenant context

2. **Tenant Middleware** (`requireTenant`)
   - Ensures tenant ID is available
   - Required for all tenant-scoped operations

3. **Role Middleware** (`requireRole`)
   - Checks user role
   - Enforces role-based permissions

4. **Module Middleware** (`isModuleEnabled`)
   - Verifies module access from subscription
   - Returns 403 if module not enabled

5. **Sensitive Data Logging** (`logSensitiveDataAccess`)
   - Logs access to sensitive endpoints
   - Creates audit trail

### Hooks System

Event-driven hooks for business logic:

- **Accounting Hooks**: Auto-create journal entries for financial transactions
- **Loan Hooks**: Calculate EMI, create schedules, update balances
- **Savings Hooks**: Update account balances, calculate interest

### Services Layer

Business logic separated into service modules:

- `accounting.ts` - Accounting operations
- `financial-calculations.ts` - Financial calculations
- `loan-statistics.ts` - Loan analytics
- `member-statistics.ts` - Member analytics
- `liquidity-analysis.ts` - Liquidity analysis
- `aml/` - AML monitoring and risk assessment
- `hrm/` - HRM operations (payroll, attendance, leave)

---

## Frontend Documentation

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 14.1.0 (App Router) |
| **Language** | TypeScript 5.3.3 |
| **UI Library** | React 18.3.1 |
| **Styling** | Tailwind CSS 3.4.1 |
| **UI Components** | Radix UI |
| **Forms** | React Hook Form 7.66.0 + Zod 3.22.4 |
| **Charts** | Recharts 2.10.3 |
| **Icons** | Lucide React 0.554.0 |
| **State Management** | React Context API |
| **Date Handling** | date-fns 4.1.0 |
| **Testing** | Vitest 3.0.6 + React Testing Library |

### Project Structure

```
apps/frontend-web/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── [subdomain]/      # Multi-tenant routing
│   │   ├── dashboard/        # Dashboard page
│   │   ├── members/          # Member management
│   │   ├── savings/          # Savings module
│   │   ├── loans/            # Loans module
│   │   ├── shares/           # Shares module
│   │   ├── general-ledger/   # Accounting module
│   │   ├── hrm/              # HRM module
│   │   ├── governance/       # Governance module
│   │   ├── compliance/       # Compliance module
│   │   ├── reports/          # Reports module
│   │   ├── login/            # Login page
│   │   ├── register/         # Registration page
│   │   └── layout.tsx        # Root layout
│   ├── components/           # React components
│   │   ├── charts/           # Chart components
│   │   ├── savings/          # Savings-specific components
│   │   ├── ui/               # Reusable UI components
│   │   ├── Layout.tsx        # Main layout wrapper
│   │   ├── Header.tsx        # App header
│   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   ├── Navigation.tsx    # Navigation component
│   │   └── ...
│   ├── contexts/             # React Context providers
│   │   └── AuthContext.tsx   # Authentication context
│   └── lib/                  # Utility functions
│       └── utils.ts          # Helper utilities
├── public/                   # Static assets
└── next.config.js            # Next.js configuration
```

### Key Features

#### 1. Multi-Tenant UI
- **Subdomain Routing**: Dynamic routing based on subdomain
- **Tenant Context**: Cooperative information in global state
- **Module Visibility**: UI elements shown/hidden based on subscription

#### 2. Authentication System
- **Login/Logout**: JWT-based authentication
- **Token Management**: localStorage-based token storage
- **Protected Routes**: Route-level authentication guards
- **Auto-refresh**: Automatic token validation

#### 3. Dashboard
- **Overview Statistics**: Key metrics and KPIs
- **Charts & Visualizations**: Data visualization with Recharts
- **Quick Actions**: Shortcuts to common operations
- **Recent Activity**: Activity feed

#### 4. Member Management
- **Member List**: Paginated member listing
- **Member Details**: Comprehensive member profile
- **KYC Management**: KYC form and approval workflow
- **Institution KYC**: Separate flow for institutional members
- **Member Onboarding**: Multi-step registration process

#### 5. Financial Modules

**Savings**
- Product management
- Account creation and management
- Transaction processing
- Account statements

**Loans**
- Loan product configuration
- Application management
- Disbursement workflow
- EMI tracking
- Loan statements

**Shares**
- Share issuance
- Share returns
- Share transfers
- Share certificates
- Share statements

**General Ledger**
- Chart of accounts
- Journal entries
- Ledger views
- Financial statements
- Account categorization (Assets, Liabilities, Equity, Income, Expenses)

#### 6. HRM Module
- **Employee Management**: Employee records and profiles
- **Payroll**: Payroll processing and history
- **Attendance**: Attendance tracking
- **Leave Management**: Leave requests and approvals
- **Training**: Training sessions and attendance
- **Settings**: HRM configuration

#### 7. Governance Module
- **Meetings**: Meeting creation and management
- **AGM**: Annual General Meeting management
- **Committees**: Committee management
- **Reports**: Governance reports and minutes

#### 8. Compliance Module
- **AML Dashboard**: Overview of compliance status
- **AML Cases**: Case management
- **KYM Status**: Know Your Member status tracking
- **Risk Reports**: Risk assessment reports
- **TTR Queue**: Threshold Transaction Reports queue
- **KYC Updates**: Member KYC update workflow

#### 9. Reports Module
- **Financial Statements**: Balance sheets, income statements
- **Member Reports**: Member statistics and analytics
- **Loan Reports**: Loan portfolio reports
- **Savings Reports**: Savings account summaries
- **Audit Reports**: System audit logs

#### 10. UI Components

**Reusable Components**
- Button, Input, Select, Checkbox (Radix UI based)
- Card, Accordion
- Date Picker (with Nepali calendar support)
- Rich Text Editor
- Confirm Modal
- Chart Wrapper

**Chart Components**
- Member Growth Chart
- Demographic Chart
- Geographic Chart
- Status Distribution Chart
- Trends Chart
- Workflow Breakdown Chart

### Routing Structure

Next.js App Router file-based routing:

```
/app
  /[subdomain]          # Multi-tenant landing
  /dashboard            # Main dashboard
  /login                # Authentication
  /register             # Registration
  /members              # Member list
    /[id]               # Member details
      /kyc              # KYC form
      /institution-kyc  # Institution KYC
    /new                # New member
    /all                # All members
    /kyc-approvals      # KYC approvals
  /savings              # Savings module
  /loans                # Loans module
  /shares               # Shares module
  /general-ledger       # Accounting
    /assets
    /liabilities
    /equity
    /income
    /expenses
    /statement/[id]
  /hrm                  # HRM module
    /employees
    /payroll
    /leave
    /attendance
    /training
    /settings
  /governance           # Governance
    /meetings
    /agm
    /committees
    /reports
  /compliance           # Compliance
    /dashboard
    /cases
    /kym-status
    /risk-report
    /ttr-queue
  /reports              # Reports
    /financial-statements
    /member
    /loan
    /savings
    /audit
```

### State Management

**Authentication Context** (`AuthContext`)
- User information
- Cooperative/tenant data
- Authentication token
- Login/logout functions
- Module access checking
- Auto-refresh functionality

### Form Handling

- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **@hookform/resolvers**: Zod integration
- **Validation**: Client-side and server-side validation

### Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Custom Components**: Radix UI primitives styled with Tailwind
- **Responsive Design**: Mobile-first approach
- **Dark Mode Ready**: Tailwind dark mode support

---

## Database Schema

### Core Models

#### Tenancy & Subscription
- **Cooperative**: Tenant entity with subdomain
- **Plan**: Subscription plans with enabled modules
- **Subscription**: Active subscriptions per cooperative

#### Identity & Access Management
- **User**: System users (staff)
- **Role**: User roles (Admin, Manager, etc.)
- **Member**: Cooperative members (customers)

#### Financial
- **ChartOfAccounts**: Account structure
- **JournalEntry**: Accounting entries
- **Transaction**: Financial transactions
- **Ledger**: Account ledgers
- **SavingProduct**: Savings product definitions
- **SavingAccount**: Member savings accounts
- **LoanProduct**: Loan product definitions
- **LoanApplication**: Loan applications
- **EMISchedule**: EMI payment schedules
- **ShareAccount**: Member share accounts
- **ShareTransaction**: Share transactions

#### HRM
- **Employee**: Employee records
- **Department**: Organizational departments
- **Designation**: Job designations
- **Shift**: Work shifts
- **LeaveType**: Leave type definitions
- **LeaveRequest**: Leave requests
- **Attendance**: Attendance records
- **PayrollRun**: Payroll execution records
- **Payroll**: Individual payroll records
- **PayrollSettings**: Payroll configuration
- **TrainingSession**: Training sessions
- **TrainingAttendance**: Training attendance

#### Governance
- **Meeting**: Board/committee meetings
- **MeetingMinute**: Meeting minutes
- **AGM**: Annual General Meetings
- **Committee**: Committees
- **Decision**: Meeting decisions

#### Compliance
- **MemberKYC**: Member KYC records
- **InstitutionKYC**: Institution KYC records
- **AmlFlag**: AML transaction flags
- **AmlCase**: AML investigation cases
- **AmlTtrReport**: Threshold Transaction Reports
- **SourceOfFundsDeclaration**: Source of funds
- **SanctionListUN**: UN sanctions list
- **SanctionListHomeMinistry**: Home Ministry sanctions
- **WhitelistedMatch**: Whitelisted AML matches
- **SensitiveDataAccessLog**: Audit log for sensitive data

#### Document Management
- **MemberDocument**: Member documents
- **OfficialDocument**: Official documents

#### Workflow
- **WorkflowHistory**: Workflow execution history
- **MemberWorkflowHistory**: Member onboarding workflow

#### Reporting
- **ManagerReport**: Manager reports
- **AuditLog**: System audit logs

### Key Relationships

- Cooperative → Users (1:N)
- Cooperative → Members (1:N)
- Cooperative → Subscription (1:1)
- Subscription → Plan (N:1)
- User → Role (N:1)
- Member → SavingAccount (1:N)
- Member → LoanApplication (1:N)
- Member → ShareAccount (1:1)
- Employee → Cooperative (N:1)
- Meeting → Cooperative (N:1)

---

## Authentication & Authorization

### Authentication Flow

1. **Login Request**
   ```
   POST /api/auth/login
   Body: { email, password }
   ```

2. **Server Validation**
   - Verify email exists
   - Compare password hash
   - Check user is active
   - Verify cooperative subscription

3. **Token Generation**
   - Create JWT with user ID, cooperative ID, role
   - Set expiration (typically 24 hours)
   - Return token + user data

4. **Client Storage**
   - Store token in localStorage
   - Store user data in React Context
   - Set Authorization header for subsequent requests

5. **Request Authentication**
   - Client sends: `Authorization: Bearer <token>`
   - Server validates token
   - Extracts user/tenant context
   - Proceeds with request

### Authorization Levels

1. **Public Routes**: No authentication required
2. **Authenticated Routes**: Valid JWT required
3. **Role-Based Routes**: Specific role required
4. **Module-Based Routes**: Subscription module required

### Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Expiration**: Time-limited tokens
- **Token Validation**: Server-side token verification
- **Tenant Isolation**: Automatic data scoping
- **Sensitive Data Logging**: Audit trail for sensitive operations
- **CORS**: Configured for cross-origin requests

---

## Development Guide

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL database
- Git

### Setup Instructions

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd MyERP
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Configuration**
   ```bash
   # Backend
   cp apps/backend/env.example apps/backend/.env
   # Edit apps/backend/.env with your database URL and JWT secret
   
   # Frontend
   cp apps/frontend-web/env.example apps/frontend-web/.env.local
   # Edit with API URL: NEXT_PUBLIC_API_URL=http://localhost:3001/api
   ```

4. **Database Setup**
   ```bash
   cd packages/db-schema
   pnpm generate  # Generate Prisma client
   pnpm migrate   # Run migrations
   pnpm seed      # Seed initial data (optional)
   ```

5. **Run Development Servers**
   ```bash
   # From root - runs both frontend and backend
   pnpm dev
   
   # Or individually:
   cd apps/backend && pnpm dev      # Backend on :3001
   cd apps/frontend-web && pnpm dev # Frontend on :3000
   ```

### Development Scripts

**Root Level**
- `pnpm dev` - Run all apps in development
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages

**Backend**
- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Compile TypeScript
- `pnpm start` - Run production build
- `pnpm test` - Run tests
- `pnpm register:coop` - Register new cooperative
- `pnpm enable:compliance` - Enable compliance module
- `pnpm seed:aml` - Seed AML data

**Frontend**
- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm lint` - Lint code

### Code Structure Guidelines

1. **Backend**
   - Controllers: Handle HTTP requests/responses
   - Services: Business logic
   - Routes: API endpoint definitions
   - Middleware: Request processing
   - Hooks: Event-driven logic

2. **Frontend**
   - Pages: Next.js route pages
   - Components: Reusable UI components
   - Contexts: Global state management
   - Lib: Utility functions

3. **Shared**
   - Types: Shared TypeScript interfaces
   - Schema: Database schema definitions

### Testing

- **Backend**: Vitest for unit and integration tests
- **Frontend**: Vitest + React Testing Library
- **Test Location**: `__tests__` directories or `.test.ts` files

### Linting & Formatting

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Run linters on staged files

### Deployment Considerations

1. **Environment Variables**: Ensure all required env vars are set
2. **Database Migrations**: Run migrations before deployment
3. **Build Process**: Build all packages before deployment
4. **Static Assets**: Configure CDN for static files
5. **API URL**: Update frontend API URL for production
6. **CORS**: Configure CORS for production domains
7. **HTTPS**: Use HTTPS in production
8. **Database Backups**: Regular backup strategy

---

## API Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Paginated Response
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Environment Variables

### Backend (.env)
```env
PORT=3001
API_PREFIX=/api
DATABASE_URL=postgresql://user:password@localhost:5432/myerp
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## Additional Resources

- **Project README**: See `README.md` for quick start
- **Development Plan**: See `docs/documentation.md`
- **Health Report**: See `PROJECT_HEALTH_REPORT.md`
- **Manager Report Setup**: See `MANAGER_REPORT_SETUP.md`

---

## Support & Contribution

For questions, issues, or contributions, please refer to the project repository or contact the development team.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: MyERP Development Team

