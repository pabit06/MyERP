# MyERP - Modular Multi-Tenant SaaS ERP System

A comprehensive, multi-tenant ERP system for cooperative management with modular architecture supporting flexible pricing tiers.

## Project Structure

This is a pnpm monorepo containing:

- **`apps/backend`**: Node.js/Express.js backend server
- **`apps/frontend-web`**: Next.js application for staff dashboard and public websites
- **`apps/mobile-member`**: React Native (Expo) application for cooperative members
- **`packages/db-schema`**: Centralized Prisma database schemas
- **`packages/shared-types`**: Shared TypeScript types and interfaces

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL database

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:
   - Copy `apps/backend/.env.example` to `apps/backend/.env` and configure your database URL

3. Generate Prisma client:

```bash
cd packages/db-schema
pnpm generate
```

4. Run database migrations:

```bash
cd packages/db-schema
pnpm migrate
```

### Development

Run all apps in development mode:

```bash
pnpm dev
```

Or run individual apps:

```bash
# Backend
cd apps/backend
pnpm dev

# Frontend Web
cd apps/frontend-web
pnpm dev

# Mobile Member
cd apps/mobile-member
pnpm dev
```

### Building

Build all packages and apps:

```bash
pnpm build
```

### Linting

Lint all packages and apps:

```bash
pnpm lint
```

## Development Plan

See [MyERP Documentation](./docs/documentation.md) for the complete development plan.

## License

Private
