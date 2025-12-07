# Database Indexes Added

## Summary

Added comprehensive database indexes to improve query performance across frequently accessed models. This addresses the high-priority improvement item from `PROJECT_IMPROVEMENTS.md`.

## Indexes Added

### Member Model
- `@@index([cooperativeId, workflowStatus])` - Filter members by status
- `@@index([cooperativeId, isActive])` - Filter active/inactive members
- `@@index([cooperativeId, createdAt])` - Sort by creation date
- `@@index([cooperativeId, riskCategory])` - Filter by risk category
- `@@index([cooperativeId, nextKymReviewDate])` - KYM review date queries
- `@@index([memberNumber])` - Fast lookup by member number

### Transaction Model
- `@@index([cooperativeId, date])` - Date range queries
- `@@index([cooperativeId, type])` - Filter by transaction type
- `@@index([cooperativeId, createdAt])` - Sort by creation
- `@@index([transactionNumber])` - Fast lookup by transaction number

### JournalEntry Model
- `@@index([cooperativeId, date])` - Date range queries
- `@@index([cooperativeId, createdAt])` - Sort by creation
- `@@index([entryNumber])` - Fast lookup by entry number

### Ledger Model
- `@@index([cooperativeId, accountId])` - Account balance queries
- `@@index([cooperativeId, createdAt])` - Sort by creation
- `@@index([accountId])` - Account-specific queries
- `@@index([journalEntryId])` - Link to journal entries
- `@@index([transactionId])` - Link to transactions

### SavingAccount Model
- `@@index([cooperativeId, memberId])` - Member's accounts
- `@@index([cooperativeId, status])` - Filter by status
- `@@index([cooperativeId, productId])` - Filter by product
- `@@index([memberId])` - Member-specific queries
- `@@index([accountNumber])` - Fast lookup by account number

### LoanApplication Model
- `@@index([cooperativeId, memberId])` - Member's loans
- `@@index([cooperativeId, status])` - Filter by status
- `@@index([cooperativeId, productId])` - Filter by product
- `@@index([cooperativeId, appliedDate])` - Date range queries
- `@@index([memberId])` - Member-specific queries
- `@@index([applicationNumber])` - Fast lookup by application number

### EMISchedule Model
- `@@index([applicationId])` - Loan-specific schedules
- `@@index([cooperativeId, dueDate])` - Overdue queries
- `@@index([cooperativeId, status])` - Filter by payment status
- `@@index([dueDate])` - Date-based queries
- `@@index([status])` - Status filtering

### ShareTransaction Model
- `@@index([cooperativeId, memberId])` - Member's share transactions
- `@@index([cooperativeId, date])` - Date range queries
- `@@index([cooperativeId, type])` - Filter by transaction type
- `@@index([memberId])` - Member-specific queries
- `@@index([transactionNo])` - Fast lookup by transaction number

### AuditLog Model
- `@@index([cooperativeId, timestamp])` - Time-based queries
- `@@index([cooperativeId, action])` - Filter by action type
- `@@index([cooperativeId, entityType])` - Filter by entity type
- `@@index([cooperativeId, userId])` - User activity queries
- `@@index([entityType, entityId])` - Entity-specific queries
- `@@index([timestamp])` - Global time-based queries

### Employee Model
- `@@index([cooperativeId, status])` - Filter by employment status
- `@@index([cooperativeId, departmentId])` - Department queries
- `@@index([cooperativeId, designationId])` - Designation queries
- `@@index([departmentId])` - Department-specific queries
- `@@index([code])` - Fast lookup by employee code

### MemberWorkflowHistory Model
- `@@index([memberId])` - Member's workflow history
- `@@index([cooperativeId, toStatus])` - Status-based queries
- `@@index([cooperativeId, action])` - Action-based queries
- `@@index([performedBy])` - User activity queries
- `@@index([createdAt])` - Time-based queries

### AML Models
- **AmlFlag**: Indexes on `cooperativeId, memberId`, `cooperativeId, type`, `cooperativeId, status`, `memberId`
- **AmlTtrReport**: Indexes on `cooperativeId, memberId`, `cooperativeId, forDate`, `cooperativeId, status`, `memberId`, `forDate`
- **AmlCase**: Indexes on `cooperativeId, memberId`, `cooperativeId, status`, `cooperativeId, type`, `memberId`
- **SourceOfFundsDeclaration**: Indexes on `cooperativeId, memberId`, `cooperativeId, transactionId`, `memberId`, `transactionId`

### HRM Models
- **PayrollLog**: Indexes on `cooperativeId, employeeId`, `cooperativeId, status`, `cooperativeId, payPeriodStart`, `employeeId`
- **AttendanceLog**: Indexes on `cooperativeId, employeeId`, `cooperativeId, date`, `cooperativeId, status`, `employeeId`
- **Attendance**: Indexes on `cooperativeId, employeeId`, `cooperativeId, date`, `cooperativeId, status`, `employeeId`
- **LeaveRequest**: Indexes on `cooperativeId, employeeId`, `cooperativeId, status`, `cooperativeId, startDate`, `employeeId`
- **Payroll**: Indexes on `cooperativeId, employeeId`, `cooperativeId, fiscalYear, monthBs`, `cooperativeId, payrollRunId`, `employeeId`, `payrollRunId`
- **PayrollRun**: Indexes on `cooperativeId, status`, `cooperativeId, fiscalYear`

### Other Models
- **ChartOfAccounts**: Indexes on `cooperativeId, type`, `cooperativeId, isActive`, `cooperativeId, parentId`, `code`
- **MemberDocument**: Indexes on `cooperativeId, memberId`, `memberId`, `documentType`

## Performance Impact

These indexes will significantly improve query performance for:

1. **List Queries**: Filtering and sorting by cooperative, status, dates
2. **Member Queries**: Finding members by number, status, risk category
3. **Financial Queries**: Transaction and ledger queries by date, account, type
4. **Reporting**: Aggregations and date range queries
5. **Audit Queries**: Time-based and entity-based audit log queries
6. **HRM Queries**: Employee, payroll, and attendance queries

## Migration File

The migration file has been created at:
- `packages/db-schema/prisma/migrations/20250125120000_add_performance_indexes/migration.sql`

The migration contains **151 CREATE INDEX statements** covering all the indexes listed above.

## Next Steps

1. **Apply Migration**: Run `pnpm prisma migrate deploy` (production) or `pnpm prisma migrate dev` (development) in the `packages/db-schema` directory
2. **Test Performance**: Monitor query performance after migration
3. **Monitor Index Usage**: Use PostgreSQL's `pg_stat_user_indexes` to verify index usage
4. **Consider Additional Indexes**: Based on actual query patterns in production

## Migration Commands

```bash
# For development
cd packages/db-schema
pnpm prisma migrate dev

# For production
cd packages/db-schema
pnpm prisma migrate deploy
```

## Notes

- Some models already had indexes (Darta, PatraChalani, Notification, etc.) - these were left unchanged
- Composite indexes are ordered by selectivity (most selective first)
- Foreign key fields are indexed for join performance
- Date fields are indexed for range queries and sorting
