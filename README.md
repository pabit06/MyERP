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

The project uses **Vitest** for testing.

```bash
# Run tests for all packages
pnpm test

# Run tests for backend only
pnpm --filter backend test
```

## 📝 Documentation

For more detailed information, please refer to the [docs](./docs) directory:
- [Project Documentation](./docs/documentation.md)
- [Technical Documentation](./TECHNICAL_DOCUMENTATION.md)

## 📄 License

Private Property. All rights reserved.
