# MyERP - Modular Multi-Tenant SaaS ERP System

MyERP is a comprehensive, multi-tenant ERP system designed for cooperative management. It features a modular architecture supporting flexible pricing tiers, multi-tenancy, and a wide range of business operations including accounting, human resources, and member management.

## 🚀 Features

MyERP is built with modularity in mind. Key modules include:

- **Core Banking System (CBS)**: Day book, voucher management.
- **Member Management**: KYC (Know Your Customer), member workflows, onboarding, and statistics.
- **Savings & Loans**: Savings accounts, loan processing, EMI calculations, and interest management.
- **Shares Management**: Share issuance, transfer, and tracking.
- **Accounting**: General ledger, financial reporting, chart of accounts.
- **HRM (Human Resource Management)**: Employee records, attendance, leave management, and payroll.
- **Governance**: Meeting management, board of directors tracking, and compliance.
- **Inventory**: Stock tracking and management.
- **DMS (Document Management System)**: Digital storage and retrieval of documents.
- **Compliance**: AML (Anti-Money Laundering) monitoring, risk assessment, and reporting (GoAML).
- **SaaS Management**: Subscription handling, tenant management, and billing.

## 🛠 Tech Stack

This project is a monorepo managed with **pnpm** workspaces.

### Backend (`apps/backend`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database ORM**: Prisma
- **Testing**: Vitest
- **Architecture**: Controller-Service-Repository pattern

### Frontend Web (`apps/frontend-web`)
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **State/Context**: React Context API

### Mobile App (`apps/mobile-member`)
- **Framework**: React Native (Expo)
- **Language**: TypeScript

### Shared Packages
- **`packages/db-schema`**: Centralized Prisma database schema and migrations.
- **`packages/shared-types`**: Shared TypeScript interfaces and types used across apps.

## 📚 Documentation

### Wiki

Comprehensive wiki documentation is available in the `.github/wiki/` directory:
- **[Wiki Home](.github/wiki/Home.md)** - Complete wiki index and navigation
- **[Getting Started](.github/wiki/Getting-Started.md)** - Installation and setup guide
- **[Architecture](.github/wiki/Architecture.md)** - System architecture overview
- **[Development Guide](.github/wiki/Development.md)** - Development workflows and best practices
- **[FAQ](.github/wiki/FAQ.md)** - Frequently asked questions

The wiki can be used to populate GitHub Wiki or serve as local documentation.

### Project Documentation

All project documentation is organized in the `docs/` directory:

- **Setup & Configuration**: `docs/setup/` - Database setup, credentials, notification setup
- **Implementation**: `docs/implementation/` - Implementation summaries and task tracking
- **Migration**: `docs/migration/` - Migration guides and status
- **RBAC**: `docs/rbac/` - Role-Based Access Control documentation
- **Testing**: `docs/testing/` - Testing guides and setup
- **Project Info**: `docs/project/` - Project stack, dependencies, commands
- **Planning**: `docs/planning/` - Project plans and folder structure
- **Reference**: `docs/reference/` - Reference materials and external documents

**Quick Links:**
- [Documentation Index](docs/README.md) - Complete documentation index
- [Documentation Structure](docs/DOCUMENTATION_STRUCTURE.md) - Structure explanation
- [Documentation Management](docs/DOCUMENTATION_MANAGEMENT.md) - How to manage docs

**Note**: Keep the root directory clean - only `README.md` should be in the root. All other documentation belongs in `docs/`.

## 📂 Project Structure

```
e:/MyERP/
├── apps/
│   ├── backend/          # Node.js/Express backend
│   ├── frontend-web/     # Next.js web application
│   └── mobile-member/    # React Native mobile app
├── packages/
│   ├── db-schema/        # Prisma schema and migrations
│   └── shared-types/     # Shared TypeScript types
├── docs/                 # Documentation
└── scripts/              # Global utility scripts
```

## 🏁 Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **PostgreSQL**: A running PostgreSQL instance

### Installation

1.  **Clone the repository** (if applicable) and navigate to the project root.

2.  **Install dependencies**:
    ```bash
    pnpm install
    ```

3.  **Environment Setup**:
    -   **Backend**: Copy `apps/backend/.env.example` to `apps/backend/.env` and configure your `DATABASE_URL` and other secrets.
    -   **Frontend**: Copy `apps/frontend-web/.env.example` to `apps/frontend-web/.env`.
    -   **Database**: Copy `packages/db-schema/.env.example` to `packages/db-schema/.env`.

4.  **Database Setup**:
    Generate the Prisma client and push the schema to your database.

    ```bash
    # Generate Prisma Client
    pnpm --filter db-schema generate

    # Run Migrations
    pnpm --filter db-schema migrate
    ```

    *Optional: Seed the database with initial data*
    ```bash
    cd packages/db-schema
    pnpm seed
    ```

## 💻 Development

You can run the entire stack or individual applications.

### Run All Apps
```bash
pnpm dev
```

### Run Individual Apps

**Backend**
```bash
cd apps/backend
pnpm dev
```
*Runs on port defined in `.env` (default: 4000)*

**Frontend Web**
```bash
cd apps/frontend-web
pnpm dev
```
*Runs on http://localhost:3000*

**Mobile App**
```bash
cd apps/mobile-member
pnpm dev
```

## 🧪 Testing

The project uses **Vitest** for unit tests and **Playwright** for E2E tests.

```bash
# Run unit tests for all packages
pnpm test

# Run tests for backend only
pnpm --filter backend test

# Run E2E tests (backend)
cd apps/backend
pnpm test:e2e

# Run E2E tests in UI mode
pnpm test:e2e:ui
```

## 🚀 CI/CD

The project uses **GitHub Actions** for continuous integration and deployment.

### Workflows

- **CI**: Runs on every push/PR (lint, type-check, build, tests)
- **CD**: Deploys on push to `main` branch
- **Security Audit**: Weekly security vulnerability checks
- **Dependency Updates**: Weekly dependency update monitoring

See [CICD_SETUP.md](./docs/ci-cd/CICD_SETUP.md) for detailed setup instructions.

### Quick Setup

1. Configure GitHub secrets (see [.github/SECRETS_SETUP.md](.github/SECRETS_SETUP.md))
2. Set up branch protection (see [.github/BRANCH_PROTECTION_SETUP.md](.github/BRANCH_PROTECTION_SETUP.md))
3. Push a change to trigger workflows

## 📝 Documentation

For more detailed information, please refer to the [docs](./docs) directory:
- [Project Documentation](./docs/documentation.md)
- [Technical Documentation](./TECHNICAL_DOCUMENTATION.md)

## 📄 License

Private Property. All rights reserved.
