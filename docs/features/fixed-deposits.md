# Fixed Deposited (FD) Feature Walkthrough

This document outlines the newly implemented Fixed Deposits module, covering database schema changes, backend APIs, and frontend user interfaces.

## 1. Database Schema

New models added to `schema.prisma`:

- **FixedDepositProduct**: Configuration for FD schemes (Interest Rate, Duration, Penalties).
- **FixedDepositAccount**: Represents a member's FD account (Principal, Maturity Date, Status).

## 2. Backend API

**Controller**: `FixedDepositController.ts`

- `createProduct`: Create new FD schemes.
- `getProducts`: List active schemes.
- `openAccount`: Open a new FD account with automated Journal Entries (Debit Cash/Savings, Credit Liability).
- `getAccounts`: List accounts with filtering.
- `getAccount`: detailed view of a specific account.
- `calculateDailyInterest`: Batch job logic to accrue interest daily.
- `closeAccount`: Handles maturity and premature closure with penalty calculation and tax deduction.

**Routes**: `/api/fixed-deposits/*`

## 3. Frontend UI

**Navigation**: Added "Fixed Deposits" section to Sidebar.

**Pages**:

1.  **Product List**: View available FD schemes.
2.  **Account List** (`/fixed-deposits/accounts`):
    - Lists all member FD accounts.
    - Status indicators (Active, Matured, Closed).
    - Search functionality.
3.  **New Account Wizard** (`/fixed-deposits/accounts/new`):
    - Select Member and Product.
    - Input Principal Amount.
    - Choose Funding Source (Cash/Savings).
    - Nominee details.
4.  **Account Details** (`/fixed-deposits/accounts/[id]`):
    - View comprehensive details (Principal, Rate, Dates).
    - **Actions**:
      - **Premature Close**: Identify if penalty applies.
      - **Maturity Close**: Full payout.
    - Visual indicators for status.

## Verification

- **Build**: Frontend and Backend builds verified.
- **Type Safety**: strict TypeScript checks enabled (some legacy repo warnings persisted).
- **Flow**: Verified flow from opening -> listing -> details -> closing.

## Pending / Future Work

- Integration of `calculateDailyInterest` with a Cron Job scheduler (e.g., BullMQ or node-cron).
- PDF Certificate Generation.
