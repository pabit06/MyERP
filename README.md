# MyERP - Modular Multi-Tenant SaaS ERP System

> A comprehensive, enterprise-grade ERP system designed for cooperative management with modular architecture, multi-tenancy, and extensive business operations support.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange.svg)](https://pnpm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Private-red.svg)](LICENSE)

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Security](#-security)
- [Documentation](#-documentation)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Overview

MyERP is a comprehensive, multi-tenant SaaS ERP system specifically designed for cooperative societies and financial institutions. Built with a modular architecture, it supports flexible pricing tiers, complete multi-tenancy, and a wide range of business operations including core banking, accounting, human resources, compliance, and member management.

### Key Highlights

- 🏢 **Multi-Tenant SaaS Architecture** - Complete tenant isolation with subdomain-based routing
- 🔧 **Modular Design** - Enable/disable modules per tenant subscription
- 🏦 **Core Banking System** - Full-featured banking operations
- 📊 **Comprehensive Reporting** - Financial statements, analytics, and compliance reports
- 🔐 **Enterprise Security** - RBAC, AML compliance, audit logging
- 🌐 **Nepali Calendar Support** - Full Bikram Sambat (BS) calendar integration
- 📱 **Multi-Platform** - Web application and mobile app support

## 🚀 Features

### Core Modules

#### 1. **Multi-Tenant SaaS Management**

- ✅ Cooperative/tenant registration and management
- ✅ Subscription plans with module-based pricing
- ✅ Subdomain-based routing and tenant isolation
- ✅ System admin panel for tenant management
- ✅ Plan upgrade/downgrade workflows
- ✅ Module enable/disable per tenant

#### 2. **Core Banking System (CBS)**

- ✅ Day Book (Day Begin/Day End) operations
- ✅ Voucher management (Payment, Receipt, Journal, Contra)
- ✅ Teller settlements and cash reconciliation
- ✅ EOD (End of Day) reports and processing
- ✅ System date management
- ✅ Transaction posting and validation

#### 3. **Member Management**

- ✅ Complete member onboarding workflow
- ✅ KYC/KYM (Know Your Member) forms
  - Individual member KYC
  - Institution member KYC
  - Comprehensive form with all required sections
- ✅ Member workflow status tracking (Draft → Pending → Approved → Active)
- ✅ Member statistics and analytics dashboard
- ✅ Auto-generated member numbers with sequence management
- ✅ Advanced member search and filtering
- ✅ Member documents management
- ✅ Account signatories management
- ✅ Member portal for self-service

#### 4. **Savings Management**

- ✅ Savings products configuration
- ✅ Savings accounts management
- ✅ Interest calculation (daily balance method)
- ✅ Interest posting (quarterly/annually)
- ✅ TDS (Tax Deducted at Source) management
- ✅ Nominee management
- ✅ Account status tracking (active/closed/dormant)
- ✅ Savings transactions (deposit, withdrawal, transfer)
- ✅ Account statements and reports

#### 5. **Loans Management**

- ✅ Loan products configuration
- ✅ Loan application workflow
- ✅ EMI schedule generation (flat rate, reducing balance)
- ✅ Loan approval/rejection workflow
- ✅ Loan disbursement and tracking
- ✅ EMI payment tracking and processing
- ✅ Loan statistics and analytics
- ✅ Overdue tracking and management
- ✅ Loan recovery management
- ✅ Loan restructuring capabilities

#### 6. **Shares Management**

- ✅ Share accounts per member
- ✅ Share transactions (Purchase, Return, Transfer, Bonus)
- ✅ Share certificate generation and management
- ✅ Share balance tracking
- ✅ Share transaction history
- ✅ Share register and statements

#### 7. **Fixed Deposits**

- ✅ Fixed deposit products configuration
- ✅ FD account management
- ✅ Interest calculation and maturity tracking
- ✅ Premature withdrawal handling
- ✅ Renewal and rollover options

#### 8. **Accounting System**

- ✅ Hierarchical Chart of Accounts
- ✅ General Ledger with double-entry bookkeeping
- ✅ Journal Entries and transaction recording
- ✅ Account mapping for products
- ✅ NFRS (Nepal Financial Reporting Standards) mapping
- ✅ Financial reporting hooks
- ✅ Trial balance and financial statements
- ✅ Asset management and depreciation

#### 9. **Human Resource Management (HRM)**

- ✅ Employee management and records
- ✅ Department and designation management
- ✅ Shift management
- ✅ Attendance tracking (check-in/check-out)
- ✅ Leave management
  - Leave types configuration
  - Leave requests and approvals
  - Leave balance tracking
- ✅ Payroll management
  - SSF (Social Security Fund) scheme
  - Traditional scheme
  - TDS calculation
  - Loan deductions
  - Festival bonus
  - Monthly payroll runs
- ✅ Training sessions and attendance
- ✅ Employee loan deductions

#### 10. **Governance**

- ✅ Meeting management
  - Board meetings
  - General meetings (AGM)
  - Committee meetings
  - Meeting scheduling
  - Meeting workflow (Draft → Locked → Minuted → Finalized)
- ✅ Meeting minutes and agendas
- ✅ Meeting attendees tracking
- ✅ Board of directors management
- ✅ Resolution tracking

#### 11. **Document Management System (DMS)**

- ✅ Darta/Chalani (Incoming/Outgoing documents)
- ✅ Document categorization and tagging
- ✅ Document versioning
- ✅ Digital document storage
- ✅ Document search and retrieval
- ✅ Document archival and retention policies

#### 12. **Inventory Management**

- ✅ Hierarchical inventory categories
- ✅ Inventory items and stock tracking
- ✅ Min/max level alerts
- ✅ Unit price management
- ✅ Location tracking
- ✅ Stock movement history

#### 13. **Compliance & AML**

- ✅ AML (Anti-Money Laundering) monitoring
- ✅ Risk assessment and categorization
- ✅ PEP (Politically Exposed Person) screening
- ✅ Sanction list screening (UN, Home Ministry)
- ✅ TTR (Threshold Transaction Report) generation
- ✅ STR (Suspicious Transaction Report) generation
- ✅ GoAML XML export for regulatory reporting
- ✅ AML flags and case management
- ✅ Source of funds declarations
- ✅ Continuous monitoring and alerts
- ✅ Whitelisted matches management
- ✅ Sensitive data access logging
- ✅ AML training sessions tracking

#### 14. **Reports & Analytics**

- ✅ Manager reports (monthly)
- ✅ Financial reports and statements
- ✅ Member statistics and analytics
- ✅ Loan statistics and portfolio analysis
- ✅ Governance statistics
- ✅ Liquidity analysis
- ✅ EOD reports
- ✅ Custom report generation
- ✅ Export capabilities (PDF, Excel)

#### 15. **Notifications System**

- ✅ Multi-channel notifications
  - SMS (via Twilio)
  - Email (via Nodemailer)
  - In-app notifications
  - Push notifications (mobile)
- ✅ Notification templates
- ✅ Notification status tracking
- ✅ Retry mechanism for failed notifications
- ✅ Notification preferences

#### 16. **Workflow Engine**

- ✅ Generic workflow system
- ✅ Workflow history tracking
- ✅ Status transitions and state management
- ✅ Workflow hooks and automation
- ✅ Custom workflow definitions
- ✅ Approval workflows

#### 17. **Authentication & Authorization**

- ✅ JWT-based authentication
- ✅ Role-Based Access Control (RBAC)
- ✅ Permission management
- ✅ User management
- ✅ Password hashing (bcrypt)
- ✅ Session management
- ✅ Multi-factor authentication ready

#### 18. **System Administration**

- ✅ System admin panel
- ✅ Tenant management
- ✅ User management across tenants
- ✅ Audit logging
- ✅ System health monitoring
- ✅ Performance metrics

### Special Features

- 🌏 **Nepali Calendar Support** - Full Bikram Sambat (BS) calendar integration with AD ↔ BS conversion
- 📅 **Fiscal Year Management** - Nepali fiscal year (Shrawan to Ashad) support
- 🔄 **Day Begin/Day End** - Accounting system date management
- 📱 **Member Portal** - Self-service portal for members
- 🔍 **Advanced Search** - Full-text search across entities
- 📊 **Real-time Analytics** - Dashboard with real-time statistics
- 🎨 **Modern UI** - Responsive design with Tailwind CSS and Radix UI
- 🌐 **API Documentation** - Swagger/OpenAPI documentation
- 🐳 **Docker Support** - Containerized deployment ready

## 🛠 Tech Stack

This project is a **monorepo** managed with **pnpm workspaces**.

### Backend (`apps/backend`)

**Core Framework**

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js 4.18.2
- **Language**: TypeScript 5.3.3
- **Execution**: tsx 4.21.0 (TypeScript execution)

**Database & ORM**

- **ORM**: Prisma 6.19.0
- **Database**: PostgreSQL 15+
- **Client**: @prisma/client 6.19.0

**Authentication & Security**

- **JWT**: jsonwebtoken 9.0.3
- **Password Hashing**: bcryptjs 2.4.3
- **Security Headers**: helmet 8.1.0
- **Rate Limiting**: express-rate-limit 8.2.1
- **Input Sanitization**: isomorphic-dompurify 2.9.0

**Communication**

- **Email**: nodemailer 7.0.11
- **SMS**: twilio 5.10.7

**File Handling**

- **Uploads**: multer 2.0.2
- **PDF Generation**: pdfkit 0.17.2

**Utilities**

- **CORS**: cors 2.8.5
- **Caching**: node-cache 5.1.2
- **XML**: xmlbuilder2 3.0.2
- **Nepali Dates**: nepali-date-converter 3.4.0
- **Logging**: winston 3.11.0

**Monitoring & Error Tracking**

- **Error Tracking**: @sentry/node 8.0.0
- **Profiling**: @sentry/profiling-node 8.0.0

**API Documentation**

- **Swagger**: swagger-jsdoc 6.2.8
- **UI**: swagger-ui-express 5.0.0

**Testing**

- **Unit/Integration**: Vitest 1.2.0
- **E2E**: Playwright 1.40.0

**Architecture Pattern**: Controller-Service-Repository

### Frontend Web (`apps/frontend-web`)

**Core Framework**

- **Framework**: Next.js 14.1.0 (React 18.3.1)
- **Language**: TypeScript 5.3.3
- **State Management**: React Context API

**UI & Styling**

- **CSS Framework**: Tailwind CSS 3.4.1
- **UI Components**: Radix UI
  - Accordion, Checkbox, Dropdown Menu, Select, Slot
- **Icons**: Lucide React 0.555.0
- **Animations**: tailwindcss-animate 1.0.7
- **Utilities**: clsx 2.1.1, tailwind-merge 3.4.0, class-variance-authority 0.7.1

**Forms & Validation**

- **Forms**: React Hook Form 7.68.0
- **Validation**: Zod 3.22.4
- **Resolvers**: @hookform/resolvers 5.2.2

**Date Handling**

- **Nepali Dates**: nepali-date-converter 3.4.0
- **Date Picker**: @sajanm/nepali-date-picker 5.0.6
- **Date Utilities**: date-fns 4.1.0

**Data Visualization**

- **Charts**: Recharts 2.10.3

**Tables**

- **Data Tables**: @tanstack/react-table 8.21.3

**Rich Text**

- **Editor**: react-quill 2.0.0

**Notifications**

- **Toasts**: sonner 1.4.0
- **Global**: react-hot-toast 2.6.0

**Utilities**

- **Cookies**: js-cookie 3.0.5
- **QR Codes**: react-qr-code 2.0.18

**Error Tracking**

- **Monitoring**: @sentry/nextjs 8.0.0

**Testing**

- **Framework**: Vitest 3.0.6
- **Testing Library**: @testing-library/react 16.2.0
- **DOM Testing**: @testing-library/jest-dom 6.6.3
- **DOM Environment**: jsdom 26.0.0

### Mobile App (`apps/mobile-member`)

- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Router**: Expo Router

### Shared Packages

#### `packages/db-schema`

- Centralized Prisma database schema
- Database migrations
- Seed scripts
- Type-safe database client

#### `packages/shared-types`

- Shared TypeScript interfaces and types
- API response types
- KYC types
- Institution types
- Zod schemas

### Development Tools

**Code Quality**

- **Linting**: ESLint 8.56.0
- **Formatting**: Prettier 3.7.4
- **Type Checking**: TypeScript ESLint 8.48.1
- **Git Hooks**: Husky 9.1.7
- **Pre-commit**: lint-staged 16.2.7

**Build Tools**

- **Package Manager**: pnpm 8.15.0
- **TypeScript**: 5.3.3
- **PostCSS**: 8.4.33
- **Autoprefixer**: 10.4.17

## 🏗 Architecture

### Monorepo Structure

```
MyERP/
├── apps/
│   ├── backend/              # Express.js API server
│   ├── frontend-web/         # Next.js web application
│   └── mobile-member/        # React Native mobile app
├── packages/
│   ├── db-schema/            # Prisma schema & migrations
│   └── shared-types/         # Shared TypeScript types
├── docs/                     # Project documentation
├── scripts/                  # Global utility scripts
├── docker-compose.yml        # Docker Compose configuration
└── pnpm-workspace.yaml       # pnpm workspace configuration
```

### Backend Architecture

- **Pattern**: Controller-Service-Repository
- **Routes**: Modular route organization
- **Middleware**: Authentication, authorization, validation, error handling
- **Services**: Business logic layer
- **Repositories**: Data access layer (via Prisma)
- **Hooks**: Event-driven hooks for accounting, loans, savings

### Frontend Architecture

- **Framework**: Next.js App Router
- **Components**: Feature-based component organization
- **State**: React Context API for global state
- **API Client**: Centralized API client with error handling
- **Forms**: React Hook Form with Zod validation

### Database Architecture

- **Multi-Tenant**: Tenant isolation via `cooperativeId`
- **Migrations**: Version-controlled Prisma migrations
- **Indexes**: Performance-optimized database indexes
- **Relations**: Well-defined relationships between entities

## 🏁 Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **PostgreSQL**: 15+ (running instance)
- **Git**: Latest version

### Installation

1. **Clone the repository** (if applicable) and navigate to the project root:

   ```bash
   cd MyERP
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Environment Setup**:

   **Backend**:

   ```bash
   cp apps/backend/.env.example apps/backend/.env
   # Edit apps/backend/.env and configure:
   # - DATABASE_URL
   # - JWT_SECRET
   # - Email/SMS credentials
   # - Sentry DSN (optional)
   ```

   **Frontend**:

   ```bash
   cp apps/frontend-web/.env.example apps/frontend-web/.env
   # Edit apps/frontend-web/.env and configure:
   # - NEXT_PUBLIC_API_URL
   ```

   **Database Schema**:

   ```bash
   cp packages/db-schema/.env.example packages/db-schema/.env
   # Edit packages/db-schema/.env and configure DATABASE_URL
   ```

4. **Database Setup**:

   ```bash
   # Generate Prisma Client
   pnpm --filter db-schema generate

   # Run Migrations
   pnpm --filter db-schema migrate dev

   # (Optional) Seed the database with initial data
   cd packages/db-schema
   pnpm seed
   ```

5. **Start Development Servers**:

   ```bash
   # Start both backend and frontend
   pnpm dev

   # Or start individually:
   # Backend: cd apps/backend && pnpm dev
   # Frontend: cd apps/frontend-web && pnpm dev
   ```

6. **Access the Application**:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:4000
   - **API Documentation**: http://localhost:4000/api-docs

### Quick Start with Docker

```bash
# Start all services (PostgreSQL, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 💻 Development

### Running the Development Environment

**Run All Apps** (recommended):

```bash
pnpm dev
```

**Run Individual Apps**:

**Backend**:

```bash
cd apps/backend
pnpm dev
```

_Runs on port defined in `.env` (default: 4000)_

**Frontend Web**:

```bash
cd apps/frontend-web
pnpm dev
```

_Runs on http://localhost:3000_

**Mobile App**:

```bash
cd apps/mobile-member
pnpm dev
```

### Available Scripts

**Root Level**:

```bash
pnpm dev              # Start all apps in development mode
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm format           # Format code with Prettier
pnpm type-check       # Type check all packages
pnpm test             # Run tests for all packages
```

**Backend**:

```bash
pnpm dev              # Start dev server with hot reload
pnpm build            # Compile TypeScript
pnpm start            # Start production server
pnpm test             # Run unit/integration tests
pnpm test:e2e         # Run E2E tests
pnpm test:e2e:ui      # Run E2E tests in UI mode
pnpm lint             # Lint TypeScript files
pnpm type-check       # Type check without emitting
```

**Frontend**:

```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Lint files
pnpm test             # Run tests
pnpm type-check       # Type check
```

### Code Quality

The project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for Git hooks
- **lint-staged** for pre-commit checks

Code is automatically formatted and linted on commit.

## 🧪 Testing

The project uses **Vitest** for unit/integration tests and **Playwright** for E2E tests.

### Running Tests

```bash
# Run all tests
pnpm test

# Run backend tests only
pnpm --filter backend test

# Run frontend tests only
pnpm --filter frontend-web test

# Run E2E tests (backend)
cd apps/backend
pnpm test:e2e

# Run E2E tests in UI mode (interactive)
pnpm test:e2e:ui

# Run E2E tests in debug mode
pnpm test:e2e:debug

# View E2E test report
pnpm test:e2e:report
```

### Test Coverage

- **Unit Tests**: Service and utility functions
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user workflows (auth, member onboarding, loans, savings, compliance)

## 🚀 Deployment

### Docker Deployment

The project includes Docker configurations for containerized deployment:

```bash
# Build and start all services
docker-compose up -d

# Build specific service
docker-compose build backend
docker-compose build frontend

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

See [Docker Deployment Guide](./docs/deployment/DOCKER_DEPLOYMENT.md) for detailed instructions.

### CI/CD

The project uses **GitHub Actions** for continuous integration and deployment.

**Workflows**:

- **CI**: Runs on every push/PR (lint, type-check, build, tests)
- **CD**: Deploys on push to `main` branch
- **Security Audit**: Weekly security vulnerability checks
- **Dependency Updates**: Weekly dependency update monitoring

**Features**:

- Parallel test execution
- Docker image building and pushing
- Automated deployment to staging/production
- Security scanning (CodeQL, dependency audit)
- Test coverage reporting

See [CI/CD Setup Guide](./docs/deployment/CICD_SETUP.md) for detailed setup instructions.

## 🔐 Security

MyERP includes comprehensive security features:

### Authentication & Authorization

- ✅ JWT-based authentication
- ✅ Role-Based Access Control (RBAC)
- ✅ Permission-based access control
- ✅ Password hashing with bcrypt
- ✅ Session management

### Security Middleware

- ✅ Helmet.js for security headers
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Input validation and sanitization
- ✅ SQL injection protection (Prisma ORM)
- ✅ XSS protection

### Compliance

- ✅ AML (Anti-Money Laundering) monitoring
- ✅ Audit logging
- ✅ Sensitive data access logging
- ✅ Sanction list screening
- ✅ PEP screening

### Security Best Practices

- ✅ Environment variable management
- ✅ Secure password policies
- ✅ API key management
- ✅ Dependency security scanning
- ✅ Code security scanning (CodeQL)

For detailed security information, see [SECURITY.md](./SECURITY.md) and [RBAC Documentation](./docs/security/RBAC.md).

## 📚 Documentation

### Project Documentation

All project documentation is organized in the `docs/` directory:

- **Architecture**: `docs/architecture/` - System architecture and stack details
- **Setup & Configuration**: `docs/setup/` - Database setup, credentials, notification setup
- **Deployment**: `docs/deployment/` - CI/CD and Docker deployment guides
- **Security**: `docs/security/` - RBAC and security documentation
- **Features**: `docs/features/` - Feature-specific documentation
- **Testing**: `docs/testing/` - Testing guides and setup
- **Planning**: `docs/planning/` - Project plans and roadmaps
- **Reference**: `docs/reference/` - Reference materials and API documentation

**Quick Links**:

- [Documentation Index](docs/README.md) - Complete documentation index
- [Architecture Stack](docs/architecture/STACK.md) - Detailed tech stack
- [Quick Start Guide](docs/setup/QUICK_START.md) - Quick setup guide
- [API Reference](docs/reference/API_REFERENCE.md) - API documentation

### API Documentation

Interactive API documentation is available at:

- **Swagger UI**: http://localhost:4000/api-docs (when backend is running)

### Code Documentation

- Backend code includes JSDoc comments
- TypeScript types provide inline documentation
- See individual module documentation in `docs/` directory

## 📂 Project Structure

```
MyERP/
├── apps/
│   ├── backend/                    # Backend API server
│   │   ├── src/
│   │   │   ├── config/            # Configuration files
│   │   │   ├── controllers/       # Request handlers
│   │   │   ├── services/          # Business logic
│   │   │   ├── routes/            # API routes
│   │   │   ├── middleware/        # Express middleware
│   │   │   ├── validators/        # Input validation
│   │   │   ├── lib/               # Utility libraries
│   │   │   ├── hooks/             # Event hooks
│   │   │   └── types/             # Type definitions
│   │   ├── e2e/                   # E2E tests
│   │   ├── tests/                 # Unit/integration tests
│   │   └── scripts/               # Utility scripts
│   │
│   ├── frontend-web/              # Next.js web application
│   │   ├── src/
│   │   │   ├── app/               # Next.js app router pages
│   │   │   ├── components/        # Reusable components
│   │   │   ├── features/          # Feature-specific components
│   │   │   ├── contexts/          # React contexts
│   │   │   └── lib/               # Utility functions
│   │   └── public/                # Static assets
│   │
│   └── mobile-member/             # React Native mobile app
│       └── app/                   # Expo router pages
│
├── packages/
│   ├── db-schema/                 # Prisma schema package
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Database schema
│   │   │   └── migrations/       # Database migrations
│   │   └── src/
│   │       └── client.ts         # Prisma client export
│   │
│   └── shared-types/              # Shared TypeScript types
│       └── src/                   # Type definitions
│
├── docs/                          # Project documentation
├── scripts/                       # Global utility scripts
├── docker-compose.yml             # Docker Compose config
├── pnpm-workspace.yaml            # pnpm workspace config
└── package.json                   # Root package.json
```

## 🤝 Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Ensure code is linted and formatted
6. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Write meaningful commit messages
- Add JSDoc comments for public APIs
- Write tests for new features
- Update documentation as needed

### Git Hooks

The project uses Husky for Git hooks:

- **Pre-commit**: Runs lint-staged (ESLint + Prettier)
- **Pre-push**: Runs type-check and tests (optional)

## 📄 License

**Private Property. All rights reserved.**

This project is proprietary software. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited.

---

## 📞 Support

For support, questions, or security concerns:

- **Email**: prembhandari06@gmail.com
- **Security Issues**: See [SECURITY.md](./SECURITY.md)

---

**Built with ❤️ for Cooperative Management**
