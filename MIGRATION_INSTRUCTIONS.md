# Migration Instructions - Generic Workflow History

## Migration Created ✅

Migration file has been created:

- **Path:** `packages/db-schema/prisma/migrations/20251124095812_add_generic_workflow_history/migration.sql`

## Steps to Apply Migration

### 1. Start Database Server

Make sure PostgreSQL is running on `localhost:5432`

### 2. Apply Migration

```bash
cd packages/db-schema
pnpm prisma migrate deploy
```

Or if you want to mark it as applied without running (if you've already applied it manually):

```bash
cd packages/db-schema
pnpm prisma migrate resolve --applied 20251124095812_add_generic_workflow_history
```

### 3. Generate Prisma Client

After migration is applied:

```bash
cd packages/db-schema
pnpm prisma generate
```

### 4. Verify Migration

Check that the table was created:

```sql
SELECT * FROM generic_workflow_history LIMIT 1;
```

## What the Migration Does

Creates the `generic_workflow_history` table with:

- Tracks workflow transitions for any entity type
- Stores workflow name, entity type, entity ID
- Tracks from/to status, user who made change
- Includes remarks and metadata
- Proper indexes for efficient querying

## Rollback (if needed)

If you need to rollback:

```bash
cd packages/db-schema
pnpm prisma migrate resolve --rolled-back 20251124095812_add_generic_workflow_history
```

Then manually drop the table:

```sql
DROP TABLE IF EXISTS generic_workflow_history;
```

---

**Note:** The migration is ready to apply. Just start your database server and run the commands above.
