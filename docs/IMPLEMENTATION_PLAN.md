# Implementation Plan - Key Features Roadmap

This plan outlines the technical approach for the "High Priority" and "Quick Wins" identified in the Features Analysis.

## Goal

To systematically implement high-value features that enhance the Core Banking capabilities and User Experience of the ERP system.

## User Review Required

> [!IMPORTANT]
> **Schema Changes**: Implementing Fixed Deposits and Member Portal will require significant database schema updates.
> **Security**: The Member Portal introduces a new user type (Member Users) which requires strict security boundaries separate from System Users (Staff).

## Proposed Changes

### 1. Database Schema Updates

We need to extend the Prisma schema to support new modules.

#### [MODIFY] [schema.prisma](file:///e:/MyERP/packages/database/prisma/schema.prisma)

- **Fixed Deposits**:
  - Add `FixedDepositProduct` model (interest rates, tenure, constraints).
  - Add `FixedDepositAccount` model (linked to Member, tracking principal, maturity, nominee).
- **Member Portal**:
  - Add `MemberLogin` model or extend `Member` to support authentication credentials (password hash, 2FA secret).
- **Notifications**:
  - Add `NotificationLog` and `NotificationTemplate` models if not already robust enough for Bulk operations.

### 2. Backend Logic (NestJS)

#### [NEW] Feature Modules

- **Fixed Deposits Module**:
  - `FixedDepositController`: Endpoints for product config and account opening.
  - `FixedDepositService`: Logic for interest calculation, maturity handling, and penalties.
- **Member API**:
  - Secure endpoints specifically for the Member Portal (e.g., `/api/member/profile`, `/api/member/accounts`).
  - **Auth Guard**: A separate Guard strategy for Member authentication vs Staff authentication.
- **Reporting Service**:
  - Implement service methods to generate CSV/Excel streams for "Data Export" quick wins.

### 3. Frontend Implementation (React/Next.js)

#### [NEW] Member Portal App

- Depending on architecture, this might be a new route section `/portal` or a separate sub-app.
- **Dashboard**: specialized view for members to see their summary.

#### [MODIFY] Admin Dashboard

- **Fixed Deposit Management**: UI for staff to view/create FDs for members.
- **Report Center**: UI to trigger and download the new "Data Export" reports.

## Verification Plan

### Automated Tests

- **Unit Tests**: Test interest calculation logic for FDs thoroughly (edge cases: leap years, premature withdrawal).
- **Integration Tests**: Verify end-to-end flow of opening an FD -> simulating time passage (mock) -> maturity.

### Manual Verification

- **Member Portal**: Verify a member can login and ONLY see their own data.
- **Exports**: Generate large reports and ensure file download works correctly without timing out.
