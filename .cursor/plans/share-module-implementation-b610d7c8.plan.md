<!-- b610d7c8-e5de-4c5c-b0bd-5f915c3b9230 dfe6446b-fb5f-4827-85ee-0ababee17483 -->

# Share Module Implementation Plan

## Overview

Implement a comprehensive Share (शेयर) module for the cooperative ERP system. This module manages member share ownership, transactions (purchase, return, transfer, bonus), accounting integration, and share certificate printing.

## Current State Analysis

### Already Implemented ✅

1. **Database Schema** (`packages/db-schema/prisma/schema.prisma`):

- ✅ `ShareLedger` model exists with: `id`, `memberId` (unique), `cooperativeId`, `totalShares` (Int), `shareValue` (Decimal)
- ✅ `ShareTransaction` model exists with: `id`, `transactionNumber`, `ledgerId`, `memberId`, `type` (String: "purchase", "sale", "dividend", "bonus"), `shares` (Int), `amount`, `sharePrice`, `transactionDate`, `remarks`
- ✅ One-to-one relationship: Member → ShareLedger
- ✅ One-to-many relationship: ShareLedger → ShareTransaction[]

2. **Backend API** (`apps/backend/src/routes/shares.ts`):

- ✅ `GET /api/shares/ledgers` - Get all share ledgers
- ✅ `GET /api/shares/ledgers/:memberId` - Get specific member's ledger (auto-creates if doesn't exist)
- ✅ `POST /api/shares/transactions` - Create share transaction (purchase, sale, dividend, bonus)
- ✅ `GET /api/shares/transactions` - List all transactions (with optional memberId/type filters)
- ✅ Transaction number auto-generation: `SHARE-YYYY-XXXX`
- ✅ Validation: Prevents sale if insufficient shares
- ✅ AML integration: Emits AML events for share purchases

3. **Member Workflow Integration** (`apps/backend/src/routes/member-workflow.ts`):

- ✅ Automatic share creation when member is approved (if `initialShareAmount` provided in KYC)
- ✅ Calls `postShareCapital` for accounting entry
- ✅ Creates ShareLedger and ShareTransaction automatically

4. **Accounting Service** (`apps/backend/src/services/accounting.ts`):

- ✅ `postShareCapital()` function exists - posts to Cash and Share Capital accounts
- ✅ `getCurrentSharePrice()` function exists - gets latest share price or default (100)
- ⚠️ Currently only supports cash payments (hardcoded to Cash account)

### Needs to be Added/Enhanced 🔨

1. **Schema Enhancements**:

- ❌ Add certificate fields to ShareLedger: `certificateNo`, `issueDate`
- ❌ Add `totalKitta` (alias for totalShares), `unitPrice` (alias for shareValue), `totalAmount` (calculated)
- ❌ Convert `type` from String to enum `ShareTxType` (PURCHASE, RETURN, TRANSFER, BONUS)
- ❌ Add `journalId` to ShareTransaction (link to JournalEntry)
- ❌ Add `createdBy` to ShareTransaction (track user who created)

2. **Backend API Enhancements**:

- ❌ Payment mode support (Cash/Bank/Saving Account Debit)
- ❌ New endpoints: dashboard, statements, certificates, issue, return, transfer, bonus
- ❌ Link transactions to journal entries via `journalId`
- ❌ Track `createdBy` user

3. **Accounting Service**:

- ❌ Extend `postShareCapital` to support payment modes
- ❌ Create `postShareReturn` function

4. **Frontend**:

- ❌ All frontend pages need to be created from scratch

## Implementation Tasks

### 1. Database Schema Updates

**File**: `packages/db-schema/prisma/schema.prisma`

**Implementation Approach**: Create new `ShareAccount` model (replacing `ShareLedger`) and update `ShareTransaction` with enum and new fields.

- **Create ShareAccount Model**:
- Fields: `id` (uuid), `cooperativeId`, `memberId` (unique), `totalKitta` (Int, default 0), `unitPrice` (Float, default 100), `totalAmount` (Float, default 0)
- Certificate fields: `certificateNo` (String?), `issueDate` (DateTime, default now)
- Relations: `member` (Member), `transactions` (ShareTransaction[])
- Map to table: `@@map("share_accounts")` (or keep existing table name for migration)
- Index: `@@index([cooperativeId])`

- **Create ShareTxType Enum**:
- Values: `PURCHASE`, `RETURN`, `TRANSFER`, `BONUS`

- **Update ShareTransaction Model**:
- Change `ledgerId` → `accountId` (relation to ShareAccount)
- Change `type` from String to `ShareTxType` enum
- Change `transactionNumber` → `transactionNo` (String)
- Change `shares` → `kitta` (Int, can be negative for returns)
- Remove `sharePrice` (use unitPrice from account)
- Change `transactionDate` → `date` (DateTime)
- Add `paymentMode` (String: "CASH", "BANK", "SAVING", "ADJUSTMENT")
- Add `journalId` (String?, link to JournalEntry)
- Add `createdBy` (String, User ID)
- Keep: `amount` (Float), `remarks` (String?)
- Index: `@@index([accountId])`

**Migration Note**: Since we're in dev, can create new table. If production data exists, need migration script to:

- Copy ShareLedger → ShareAccount
- Update ShareTransaction.ledgerId → accountId
- Map old type strings to enum values

### 2. Backend API Enhancements

**File**: `apps/backend/src/routes/shares.ts`

- **Update transaction creation endpoint** (`POST /api/shares/transactions`):
- Support new enum types (PURCHASE, RETURN, TRANSFER, BONUS)
- Add payment mode handling (Cash/Bank/Saving Account Debit)
- Integrate with accounting service for journal entries
- Link transaction to journal entry via `journalId`
- Track `createdBy` from authenticated user

- **New endpoints**:
- `GET /api/shares/dashboard` - Get summary statistics (total share capital, total kitta, etc.)
- `GET /api/shares/statements/:memberId` - Get member's share statement
- `GET /api/shares/certificates` - List all members with certificates ready to print
- `POST /api/shares/issue` - Issue shares (purchase) with payment mode
- `POST /api/shares/return` - Return shares (surrender)
- `POST /api/shares/transfer` - Transfer shares between members
- `POST /api/shares/bonus` - Issue bonus shares

- **Accounting Integration**:
- Extend `postShareCapital` in `apps/backend/src/services/accounting.ts` to support:
- Payment mode selection (Cash/Bank/Saving Account)
- Bank account selection when payment mode is "Bank"
- Saving account debit when payment mode is "Saving Account Debit"
- Create `postShareReturn` function for share returns (reverse entry)
- Handle journal entry creation and linking

### 3. Frontend Pages

**Directory**: `apps/frontend-web/src/app/shares/`

- **Main Shares Page** (`page.tsx`):
- Dashboard tab showing:
- Total Share Capital (कुल शेयर पूँजी)
- Total Kitta (कुल कित्ता)
- Total Members with Shares
- Recent transactions
- Tabs for: Dashboard, Issue Share, Return Share, Statement, Certificates

- **Issue Share Page** (`issue/page.tsx`):
- Form fields:
- Member Select (Searchable Dropdown with member number and name)
- Transaction Date (Date Picker)
- No. of Kitta (Number input)
- Unit Price (Auto-filled, editable, default 100)
- Total Amount (Auto-calculated: Kitta × Unit Price)
- Payment Mode (Radio/Dropdown: Cash / Bank / Saving Account Debit)
- Bank Account (conditional, shown when Bank selected)
- Saving Account (conditional, shown when Saving Account Debit selected)
- Remarks (Textarea)
- Submit button that calls `POST /api/shares/issue`
- Success message and redirect

- **Return Share Page** (`return/page.tsx`):
- Similar form to Issue Share but for returning shares
- Validation: Check if member has sufficient shares
- Payment mode for refund (Cash/Bank)
- Calls `POST /api/shares/return`

- **Statement Page** (`statement/page.tsx`):
- Member selector
- Table showing all share transactions for selected member
- Columns: Date, Type, Kitta, Amount, Balance, Remarks
- Print/Export functionality

- **Certificates Page** (`certificates/page.tsx`):
- List of all members with share accounts
- Filter/search functionality
- "Print Certificate" button for each member
- Calls certificate print page

- **Certificate Print Page** (`certificates/[memberId]/page.tsx`):
- Beautiful bordered certificate design
- Display:
- Cooperative name (श्री भञ्ज्याङ बचत तथा ऋण सहकारी संस्था लि.)
- "शेयर प्रमाणपत्र" (Share Certificate) heading
- Member name (सदस्यको नाम)
- Share member number (शेयर सदस्य नं)
- Total share kitta (जम्मा शेयर कित्ता)
- Total amount (जम्मा रकम: रु.)
- Certificate number
- Issue date
- Print-friendly CSS (hide navigation, optimize for A4)
- Print button

### 4. Sidebar Updates

**File**: `apps/frontend-web/src/components/Sidebar.tsx`

- Update existing "Shares" menu item to have submenu:
- Dashboard
- Issue Share
- Return Share
- Statement
- Certificates

### 5. Accounting Service Updates

**File**: `apps/backend/src/services/accounting.ts`

- **Enhance `postShareCapital`**:
- Add `paymentMode` parameter: 'cash' | 'bank' | 'saving_account'
- Add `bankAccountId` parameter (optional, for bank payments)
- Add `savingAccountId` parameter (optional, for saving account debit)
- Handle different debit accounts based on payment mode:
- Cash: Debit Cash account
- Bank: Debit selected Bank account
- Saving Account: Debit member's Saving Account balance
- Return journal entry ID for linking

- **New function `postShareReturn`**:
- Reverse entry: Dr. Share Capital, Cr. Cash/Bank
- Similar payment mode handling

### 6. Styling & UI Components

- Create reusable components:
- `MemberSelector` - Searchable member dropdown
- `PaymentModeSelector` - Payment mode radio/select with conditional fields
- `ShareCertificate` - Certificate print component
- Use existing design system (Tailwind CSS, consistent with Savings/Loans pages)

## Technical Considerations

1. **Migration**: Handle existing ShareLedger data migration to new ShareAccount structure
2. **Validation**: Ensure share returns don't exceed available shares
3. **Accounting**: All share transactions must create proper journal entries
4. **Permissions**: Consider role-based access (who can issue/return shares)
5. **Audit Trail**: Track all share transactions with user who created them
6. **Certificate Numbering**: Auto-generate certificate numbers (e.g., CERT-000001)

## Files to Create/Modify

**New Files**:

- `apps/frontend-web/src/app/shares/page.tsx`
- `apps/frontend-web/src/app/shares/issue/page.tsx`
- `apps/frontend-web/src/app/shares/return/page.tsx`
- `apps/frontend-web/src/app/shares/statement/page.tsx`
- `apps/frontend-web/src/app/shares/certificates/page.tsx`
- `apps/frontend-web/src/app/shares/certificates/[memberId]/page.tsx`
- `apps/frontend-web/src/components/ShareCertificate.tsx` (optional)

**Modified Files**:

- `packages/db-schema/prisma/schema.prisma`
- `apps/backend/src/routes/shares.ts`
- `apps/backend/src/services/accounting.ts`
- `apps/frontend-web/src/components/Sidebar.tsx`

## Testing Checklist

- [ ] Share purchase with cash payment
- [ ] Share purchase with bank payment
- [ ] Share purchase with saving account debit
- [ ] Share return functionality
- [ ] Share transfer between members
- [ ] Bonus share issuance
- [ ] Certificate generation and printing
- [ ] Accounting entries are created correctly
- [ ] Statement shows correct balances
- [ ] Dashboard statistics are accurate
