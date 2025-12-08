# N+1 Query Optimization Summary

## Overview

N+1 query problems have been identified and fixed in critical areas of the codebase. These optimizations significantly improve database performance by reducing the number of queries executed.

## What is N+1 Query Problem?

The N+1 query problem occurs when:

1. You fetch N records (e.g., 100 employees)
2. Then for each record, you make an additional query (e.g., fetch loan deduction)
3. Result: 1 initial query + N additional queries = N+1 queries total

**Example (Before Fix):**

```typescript
// Fetch 100 employees (1 query)
const employees = await prisma.employee.findMany({ where });

// For each employee, fetch loan deduction (100 queries!)
const preview = await Promise.all(
  employees.map(async (emp) => {
    const loanDeduction = await getEmployeeLoanDeduction(emp.id, ...); // N queries
    // ...
  })
);
// Total: 101 queries
```

**Example (After Fix):**

```typescript
// Fetch 100 employees (1 query)
const employees = await prisma.employee.findMany({ where });

// Batch fetch all loan deductions (1 query)
const loanDeductionsMap = await getBatchEmployeeLoanDeductions(
  employeeIds,
  ...
);
// Total: 2 queries
```

## Optimizations Implemented

### 1. TTR Reports - SOF Declarations ✅

**File:** `apps/backend/src/routes/compliance.ts`

**Problem:**

- Fetching TTR reports (N records)
- Then fetching SOF declaration for each TTR in a loop (N queries)

**Solution:**

- Batch fetch all SOF declarations for all TTRs in a single query
- Create a map for O(1) lookup
- Reduced from N+1 queries to 2 queries

**Before:**

```typescript
const reportsWithSof = await Promise.all(
  ttrReports.map(async (ttr) => {
    const sof = await prisma.sourceOfFundsDeclaration.findFirst({...}); // N queries
    return { ...ttr, sourceOfFunds: sof };
  })
);
```

**After:**

```typescript
// Batch fetch all SOF declarations (1 query)
const allSofDeclarations = await prisma.sourceOfFundsDeclaration.findMany({
  where: {
    memberId: { in: memberIds },
    OR: dateRanges.map(...),
  },
});

// Create map for O(1) lookup
const sofMap = new Map(...);
const reportsWithSof = ttrReports.map((ttr) => ({
  ...ttr,
  sourceOfFunds: sofMap.get(key) || null,
}));
```

### 2. Payroll Calculations - Loan Deductions ✅

**Files:**

- `apps/backend/src/routes/hrm.ts`
- `apps/backend/src/services/hrm/loan-deduction-batch.ts` (new)

**Problem:**

- Fetching employees (N records)
- Then calling `getEmployeeLoanDeduction()` for each employee in a loop
- Each call makes multiple queries (employee -> user -> member -> loans -> EMIs)
- Total: 1 + (N × 5) queries = potentially hundreds of queries

**Solution:**

- Created `getBatchEmployeeLoanDeductions()` function
- Batch fetches all related data in minimal queries:
  1. Fetch all employees with userIds
  2. Fetch all users with emails
  3. Fetch all members by emails
  4. Fetch all active loans for members
  5. Fetch all EMI schedules for loans
- Reduced from ~(1 + N × 5) queries to ~5 queries total

**Before:**

```typescript
const preview = await Promise.all(
  employees.map(async (emp) => {
    // This makes 5 queries per employee!
    const loanDeduction = await getEmployeeLoanDeduction(emp.id, ...);
    // ...
  })
);
```

**After:**

```typescript
// Batch fetch all loan deductions (5 queries total)
const loanDeductionsMap = await getBatchEmployeeLoanDeductions(
  employeeIds,
  tenantId,
  fiscalYear,
  monthBs
);

const preview = await Promise.all(
  employees.map(async (emp) => {
    // O(1) lookup from map
    const loanDeduction = loanDeductionsMap.get(emp.id) || 0;
    // ...
  })
);
```

**Performance Impact:**

- **Before:** 100 employees = ~501 queries (1 + 100 × 5)
- **After:** 100 employees = ~6 queries (1 + 5)
- **Improvement:** ~98.8% reduction in queries

### 3. Governance Routes - Already Optimized ✅

**File:** `apps/backend/src/routes/governance.ts`

**Status:** Already using `Promise.all()` for batch updates

- Agenda updates: Uses `Promise.all()` with individual updates (acceptable - Prisma doesn't support batch updates with different data)
- Attendee updates: Uses `Promise.all()` with individual updates (acceptable)

**Note:** Prisma doesn't support batch updates where each record has different data, so using `Promise.all()` with individual updates is the best approach for these cases.

## New Files Created

1. **`apps/backend/src/services/hrm/loan-deduction-batch.ts`**
   - Batch version of loan deduction calculation
   - Optimized to fetch all data in minimal queries
   - Returns a Map for O(1) lookup

## Performance Improvements

### TTR Reports Endpoint

- **Before:** N+1 queries (N = number of TTR reports)
- **After:** 2 queries (1 for TTRs, 1 for all SOF declarations)
- **Improvement:** ~50% reduction for small datasets, ~99% for large datasets

### Payroll Preview Endpoint

- **Before:** ~(1 + N × 5) queries (N = number of employees)
- **After:** ~6 queries (1 for employees, 5 for batch loan data)
- **Improvement:** ~98.8% reduction for 100 employees

### Payroll Run Creation

- **Before:** ~(1 + N × 5) queries in transaction
- **After:** ~6 queries (batch fetch before transaction)
- **Improvement:** Faster transaction execution, reduced database load

## Best Practices Applied

1. **Batch Fetching:** Fetch all related data in a single query when possible
2. **Map-Based Lookups:** Use Maps for O(1) lookups instead of repeated queries
3. **Query Reduction:** Minimize queries by fetching related data together
4. **Maintainability:** Created reusable batch functions for common patterns

### 3. Journal Entry Creation - Account & Balance Lookups ✅

**Files:**

- `apps/backend/src/services/accounting.ts`
- `apps/backend/src/services/cbs/day-book.service.ts`
- `apps/backend/src/controllers/AccountingController.ts`

**Problem:**

- Creating journal entries with N ledger entries
- Fetching account details for each entry (N queries)
- Fetching latest balance for each account (N queries)
- Total: 1 + N + N = 2N + 1 queries

**Solution:**

- Batch fetch all accounts in a single query
- Batch fetch all latest ledger entries in a single query
- Create maps for O(1) lookups
- Reduced from 2N + 1 queries to 3 queries total

**Before:**

```typescript
const ledgerEntries = await Promise.all(
  entries.map(async (entry) => {
    const account = await tx.chartOfAccounts.findUnique({...}); // N queries
    const latestLedger = await tx.ledger.findFirst({...}); // N queries
    // ...
  })
);
```

**After:**

```typescript
// Batch fetch all accounts and balances (2 queries)
const [accounts, latestLedgers] = await Promise.all([
  tx.chartOfAccounts.findMany({ where: { id: { in: accountIds } } }),
  tx.ledger.findMany({ where: { accountId: { in: accountIds } } }),
]);

// Create maps for O(1) lookup
const accountMap = new Map(...);
const balanceMap = new Map(...);

const ledgerEntries = await Promise.all(
  entries.map(async (entry) => {
    const account = accountMap.get(entry.accountId); // O(1)
    const currentBalance = balanceMap.get(entry.accountId) || 0; // O(1)
    // ...
  })
);
```

**Performance Impact:**

- **Before:** 10 entries = 21 queries (1 + 10 + 10)
- **After:** 10 entries = 3 queries (1 + 1 + 1)
- **Improvement:** ~85.7% reduction in queries

## Remaining Opportunities

While the critical N+1 problems have been fixed, there may be other opportunities:

1. **Other Routes:** Review other routes for similar patterns
2. **Complex Queries:** Some complex queries with multiple includes could be optimized further

## Testing Recommendations

1. **Load Testing:** Test endpoints with large datasets (100+ records)
2. **Query Monitoring:** Use Prisma query logging to verify query counts
3. **Performance Metrics:** Compare response times before/after optimization

## Monitoring

To monitor for N+1 problems in the future:

1. Enable Prisma query logging:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

2. Watch for patterns:
   - Loops with `await` inside
   - `Promise.all()` with many individual queries
   - Multiple queries for related data

3. Use database query analyzers to identify slow queries

## Files Modified

- ✅ `apps/backend/src/routes/compliance.ts` - Fixed TTR SOF declarations
- ✅ `apps/backend/src/routes/hrm.ts` - Fixed payroll loan deductions (2 locations)
- ✅ `apps/backend/src/services/hrm/loan-deduction-batch.ts` - New batch function

## Impact

These optimizations will significantly improve:

- **Response Times:** Faster API responses, especially for large datasets
- **Database Load:** Reduced database connections and query execution
- **Scalability:** Better performance as data grows
- **User Experience:** Faster page loads and interactions
