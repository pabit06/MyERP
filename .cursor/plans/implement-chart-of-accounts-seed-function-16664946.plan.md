<!-- 16664946-8ef4-496b-99d9-d3c70bfaf2c3 8dd522a5-b981-4799-a4cc-34d57defd178 -->

# Implement Chart of Accounts Seed Function

## Overview

Integrate the complete NFRS-compliant Chart of Accounts seed data with recursive seeding logic, 4-account rule validations, and support for isGroup/nfrsMap fields.

## Implementation Steps

### 1. Add Seed Data Constant and Helper Function

- **File**: `apps/backend/src/services/accounting.ts`
- Add `FINAL_COA_SEED_DATA` constant after imports (before existing helper functions)
- Add `seedAccountRecursive()` helper function that:
- Handles type mapping (ASSET->asset, INCOME->revenue, etc.)
- Uses upsert pattern (findFirst + update/create)
- Recursively processes children with correct parentId
- Sets isGroup and nfrsMap fields

### 2. Update AccountingService

- **File**: `apps/backend/src/services/accounting.ts`
- Add `seedDefaultAccounts()` method as first method in AccountingService
- Update `getChartOfAccounts()` to include isGroup and nfrsMap in children select
- Update `createAccount()` to:
- Accept isGroup and nfrsMap parameters
- Implement 4-account rule validation (code first char must match type)
- Validate parent must be a group (isGroup=true) if parentId provided
- Set isGroup and nfrsMap in create data
- Update `updateAccount()` to support isGroup and nfrsMap in data parameter
- Preserve existing methods: getOrCreateAccount, postTransaction, deleteAccount, etc.

### 3. Add Seed API Endpoint

- **File**: `apps/backend/src/routes/accounting.ts`
- Add POST `/api/accounting/seed` endpoint
- Use existing middleware (authenticate, requireTenant)
- Extract cooperativeId from req.user!.tenantId
- Call AccountingService.seedDefaultAccounts()
- Return success response

### 4. Update API Routes

- **File**: `apps/backend/src/routes/accounting.ts`
- Update POST `/api/accounting/accounts` to accept isGroup and nfrsMap in request body
- Pass these fields to AccountingService.createAccount()

## Technical Details

### 4-Account Rule Validation

- Asset accounts: code must start with '1'
- Liability/Equity accounts: code must start with '2'
- Revenue/Income accounts: code must start with '3'
- Expense accounts: code must start with '4'

### Type Mapping

- ASSET -> asset
- LIABILITY -> liability
- EQUITY -> equity
- INCOME/REVENUE -> revenue (schema uses 'revenue')
- EXPENSE -> expense

### Parent-Child Rules

- Parent account must have isGroup=true to have children
- Children inherit type from parent (enforced by validation)

### Idempotency

- Uses upsert pattern (findFirst + update/create)
- Safe to run multiple times
- Updates existing accounts if they already exist

## Files to Modify

1. `apps/backend/src/services/accounting.ts` - Add seed data, recursive function, update service methods
2. `apps/backend/src/routes/accounting.ts` - Add seed endpoint, update create account route

## Important Notes

- Preserve all existing helper functions (findAccountByCode, getOrCreateAccount, createJournalEntry, etc.)
- Maintain backward compatibility with existing API calls
- Seed data is already in lowercase types (no conversion needed in constant, but helper handles edge cases)
