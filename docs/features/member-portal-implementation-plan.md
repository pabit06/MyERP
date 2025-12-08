# Member Portal Implementation Plan

## Goal Description

Create a dedicated web-based Member Portal allowing cooperative members to log in, view their dashboard, check account balances (Savings/FD), and view transaction history. Use a "Route Group" strategy within the existing frontend application for rapid development while maintaining logical separation.

## User Review Required

> [!IMPORTANT]
> **Authentication**: We will add a `password` field to the `Member` table. Initial passwords can be set by admins or via a "Forgot Password" flow (future). For this MVP, we assume admins set the initial password.

## Proposed Changes

### Database Schema (`packages/db-schema`)

#### [MODIFY] `prisma/schema.prisma`

- Add `password String?` to `Member` model.
- Add `lastLogin DateTime?` to `Member` model.

### Backend (`apps/backend`)

#### [NEW] `src/controllers/MemberAuthController.ts`

- `login`: Validate member credentials (Member Number/Phone + Password).
- `changePassword`: Allow members to update their password.

#### [NEW] `src/middleware/memberAuth.ts`

- `authenticateMember`: JWT verification specifically for `Member` entity, distinct from `User` (Admin).

#### [NEW] `src/routes/member-portal.ts`

- `POST /auth/login`
- `GET /dashboard` (Summary of accounts)
- `GET /accounts` (Savings/FD list)

### Frontend (`apps/frontend-web`)

#### [NEW] `src/app/(member)` (Route Group)

Use a Route Group to isolate member pages and apply a distinct Layout.

- `src/app/(member)/layout.tsx`:
  - Distinct sidebar/header (lighter theme or different color).
  - Checks for `MemberToken` in cookies/context.
- `src/app/(member)/login/page.tsx`:
  - Dedicated login form for members.
- `src/app/(member)/dashboard/page.tsx`:
  - Welcome message.
  - Quick summary of Total Savings, Total Loans.
- `src/app/(member)/accounts/page.tsx`:
  - List of Savings and FD accounts.

## Verification Plan

### Automated Tests

- **Unit Tests**: Verify `MemberAuthController` correctly validates password hashes.

### Manual Verification

1.  **Setup**: Admin sets password for "Member A" via DB or future Admin API.
2.  **Login**: Member A logs in at `/member/login`.
3.  **Dashboard**: Verify "Welcome, Member A" and correct balance display.
4.  **Isolation**: Ensure Admin URL `/dashboard` is NOT accessible using Member credentials, and vice-versa.
