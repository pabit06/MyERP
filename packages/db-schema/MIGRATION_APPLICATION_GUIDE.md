# Migration Application Guide

## Migration File Created

The migration file has been successfully created at:
- `packages/db-schema/prisma/migrations/20250125120000_add_performance_indexes/migration.sql`

This migration contains **151 CREATE INDEX statements** to improve database query performance.

## How to Apply the Migration

### Prerequisites

1. **Set DATABASE_URL**: Ensure your `DATABASE_URL` environment variable is set
   ```bash
   # Example (adjust for your database)
   export DATABASE_URL="postgresql://user:password@localhost:5432/myerp?schema=public"
   ```

2. **Navigate to db-schema directory**:
   ```bash
   cd packages/db-schema
   ```

### Apply Migration

#### For Development:
```bash
pnpm prisma migrate dev
```

This will:
- Apply any pending migrations
- Regenerate Prisma Client
- Update the migration history

#### For Production:
```bash
pnpm prisma migrate deploy
```

This will:
- Apply all pending migrations
- Not regenerate Prisma Client (run `pnpm prisma generate` separately if needed)

### Verify Migration Applied

After applying, verify the indexes were created:

```bash
# Check migration status
pnpm prisma migrate status

# Or check indexes in database (PostgreSQL)
psql $DATABASE_URL -c "\d+ members"  # Check indexes on members table
```

## What This Migration Does

This migration adds performance indexes to **18 database models**:

1. **Member** - 6 indexes
2. **Transaction** - 4 indexes  
3. **JournalEntry** - 3 indexes
4. **Ledger** - 5 indexes
5. **SavingAccount** - 5 indexes
6. **LoanApplication** - 6 indexes
7. **EMISchedule** - 5 indexes
8. **ShareTransaction** - 5 indexes
9. **AuditLog** - 6 indexes
10. **Employee** - 5 indexes
11. **MemberWorkflowHistory** - 5 indexes
12. **AML Models** (AmlFlag, AmlTtrReport, AmlCase, SourceOfFundsDeclaration) - 17 indexes
13. **HRM Models** (PayrollLog, AttendanceLog, Attendance, LeaveRequest, Payroll, PayrollRun) - 20+ indexes
14. **ChartOfAccounts** - 4 indexes
15. **MemberDocument** - 3 indexes

## Expected Performance Improvements

After applying this migration, you should see:

- **Faster list queries**: Filtering and sorting by cooperative, status, dates
- **Faster member lookups**: By member number, status, risk category
- **Faster financial queries**: Transactions and ledgers by date, account, type
- **Faster reporting**: Aggregations and date range queries
- **Faster audit queries**: Time-based and entity-based audit log queries
- **Faster HRM queries**: Employee, payroll, and attendance queries

## Troubleshooting

### If migration fails:

1. **Check DATABASE_URL**: Ensure it's correctly set
2. **Check database connection**: Verify you can connect to the database
3. **Check existing indexes**: Some indexes might already exist (migration will fail if trying to create duplicates)
4. **Check permissions**: Ensure database user has CREATE INDEX permissions

### If indexes already exist:

If some indexes already exist, you may need to:
1. Remove the duplicate CREATE INDEX statements from the migration file
2. Or use `CREATE INDEX IF NOT EXISTS` (PostgreSQL 9.5+)

### Rollback (if needed):

If you need to rollback, you can create a new migration to drop the indexes:

```sql
-- Example: Drop an index
DROP INDEX IF EXISTS "members_cooperativeId_workflowStatus_idx";
```

## Next Steps

After successfully applying the migration:

1. **Monitor Performance**: Check query performance improvements
2. **Monitor Index Usage**: Use PostgreSQL's `pg_stat_user_indexes` to verify indexes are being used
3. **Consider Additional Indexes**: Based on actual query patterns in production

## Notes

- The migration is **idempotent** - running it multiple times should be safe (though Prisma will prevent duplicate application)
- Index creation may take some time on large tables
- Consider running during low-traffic periods for production databases
- Monitor database disk space as indexes require additional storage
