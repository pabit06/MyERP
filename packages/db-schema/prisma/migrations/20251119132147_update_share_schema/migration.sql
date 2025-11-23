-- Create ShareTxType enum
CREATE TYPE "ShareTxType" AS ENUM ('PURCHASE', 'RETURN', 'TRANSFER', 'BONUS');

-- Create share_accounts table
CREATE TABLE "share_accounts" (
    "id" TEXT NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "totalKitta" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "certificateNo" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_accounts_pkey" PRIMARY KEY ("id")
);

-- Create unique index on memberId
CREATE UNIQUE INDEX "share_accounts_memberId_key" ON "share_accounts"("memberId");

-- Create index on cooperativeId
CREATE INDEX "share_accounts_cooperativeId_idx" ON "share_accounts"("cooperativeId");

-- Migrate data from share_ledgers to share_accounts (if share_ledgers exists and has data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'share_ledgers') THEN
        INSERT INTO "share_accounts" (
            "id",
            "cooperativeId",
            "memberId",
            "totalKitta",
            "unitPrice",
            "totalAmount",
            "certificateNo",
            "issueDate",
            "createdAt",
            "updatedAt"
        )
        SELECT 
            "id",
            "cooperativeId",
            "memberId",
            COALESCE("totalShares", 0)::INTEGER,
            COALESCE("shareValue", 100)::DOUBLE PRECISION,
            (COALESCE("totalShares", 0) * COALESCE("shareValue", 100))::DOUBLE PRECISION,
            NULL,
            COALESCE("createdAt", CURRENT_TIMESTAMP),
            "createdAt",
            "updatedAt"
        FROM "share_ledgers"
        ON CONFLICT ("memberId") DO NOTHING;
    END IF;
END $$;

-- Add new columns to share_transactions table
ALTER TABLE "share_transactions" 
    ADD COLUMN IF NOT EXISTS "accountId" TEXT,
    ADD COLUMN IF NOT EXISTS "transactionNo" TEXT,
    ADD COLUMN IF NOT EXISTS "kitta" INTEGER,
    ADD COLUMN IF NOT EXISTS "paymentMode" TEXT,
    ADD COLUMN IF NOT EXISTS "journalId" TEXT,
    ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
    ADD COLUMN IF NOT EXISTS "date" TIMESTAMP(3);

-- Migrate accountId from ledgerId (if share_ledgers exists)
-- First try to match via ledgerId -> share_ledgers -> share_accounts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'share_ledgers') THEN
        UPDATE "share_transactions" st
        SET "accountId" = sa."id"
        FROM "share_ledgers" sl
        JOIN "share_accounts" sa ON sa."memberId" = sl."memberId"
        WHERE st."ledgerId" = sl."id"
        AND st."accountId" IS NULL;
    END IF;
END $$;

-- Also try to match via memberId directly (in case ledgerId migration didn't work)
UPDATE "share_transactions" st
SET "accountId" = sa."id"
FROM "share_accounts" sa
WHERE st."memberId" = sa."memberId"
AND st."accountId" IS NULL;

-- Create share_accounts for any transactions that still don't have an accountId
-- Use a simple text-based ID (memberId-based to ensure uniqueness)
INSERT INTO "share_accounts" (
    "id",
    "cooperativeId",
    "memberId",
    "totalKitta",
    "unitPrice",
    "totalAmount",
    "certificateNo",
    "issueDate",
    "createdAt",
    "updatedAt"
)
SELECT DISTINCT ON (st."memberId")
    'acc-' || st."memberId",
    st."cooperativeId",
    st."memberId",
    0,
    100,
    0,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "share_transactions" st
WHERE st."accountId" IS NULL
AND NOT EXISTS (
    SELECT 1 FROM "share_accounts" sa WHERE sa."memberId" = st."memberId"
)
ON CONFLICT ("memberId") DO NOTHING;

-- Update accountId for the newly created accounts
UPDATE "share_transactions" st
SET "accountId" = sa."id"
FROM "share_accounts" sa
WHERE st."memberId" = sa."memberId"
AND st."accountId" IS NULL;

-- Migrate data from old columns to new columns
UPDATE "share_transactions"
SET 
    "transactionNo" = COALESCE("transactionNo", "transactionNumber"),
    "kitta" = COALESCE("kitta", "shares"),
    "date" = COALESCE("date", "transactionDate")
WHERE "transactionNo" IS NULL OR "kitta" IS NULL OR "date" IS NULL;

-- Set default paymentMode for existing records
UPDATE "share_transactions"
SET "paymentMode" = 'CASH'
WHERE "paymentMode" IS NULL;

-- Convert type from TEXT to ShareTxType enum (mapping old values to new enum)
UPDATE "share_transactions"
SET "type" = CASE 
    WHEN "type" = 'purchase' THEN 'PURCHASE'
    WHEN "type" = 'sale' THEN 'RETURN'
    WHEN "type" = 'transfer' THEN 'TRANSFER'
    WHEN "type" = 'bonus' OR "type" = 'dividend' THEN 'BONUS'
    ELSE 'PURCHASE'
END::TEXT
WHERE "type" IS NOT NULL;

-- Now alter the type column to use the enum
ALTER TABLE "share_transactions" 
    ALTER COLUMN "type" TYPE "ShareTxType" USING "type"::"ShareTxType";

-- Make accountId NOT NULL after migration
ALTER TABLE "share_transactions" 
    ALTER COLUMN "accountId" SET NOT NULL;

-- Make transactionNo NOT NULL after migration
ALTER TABLE "share_transactions" 
    ALTER COLUMN "transactionNo" SET NOT NULL;

-- Make kitta NOT NULL after migration
ALTER TABLE "share_transactions" 
    ALTER COLUMN "kitta" SET NOT NULL;

-- Make paymentMode NOT NULL after migration
ALTER TABLE "share_transactions" 
    ALTER COLUMN "paymentMode" SET NOT NULL;

-- Make createdBy NOT NULL after migration (set to system user if null)
UPDATE "share_transactions"
SET "createdBy" = 'system'
WHERE "createdBy" IS NULL;

ALTER TABLE "share_transactions" 
    ALTER COLUMN "createdBy" SET NOT NULL;

-- Make date NOT NULL after migration
ALTER TABLE "share_transactions" 
    ALTER COLUMN "date" SET NOT NULL;

-- Rename amount column type from DECIMAL to DOUBLE PRECISION if needed
-- (PostgreSQL will handle this automatically, but we ensure consistency)
ALTER TABLE "share_transactions" 
    ALTER COLUMN "amount" TYPE DOUBLE PRECISION USING "amount"::DOUBLE PRECISION;

-- Drop old columns from share_transactions
ALTER TABLE "share_transactions" 
    DROP COLUMN IF EXISTS "transactionNumber",
    DROP COLUMN IF EXISTS "ledgerId",
    DROP COLUMN IF EXISTS "shares",
    DROP COLUMN IF EXISTS "sharePrice",
    DROP COLUMN IF EXISTS "transactionDate";

-- Add foreign key constraints
ALTER TABLE "share_accounts" 
    ADD CONSTRAINT "share_accounts_cooperativeId_fkey" 
    FOREIGN KEY ("cooperativeId") REFERENCES "cooperatives"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "share_accounts" 
    ADD CONSTRAINT "share_accounts_memberId_fkey" 
    FOREIGN KEY ("memberId") REFERENCES "members"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "share_transactions" 
    ADD CONSTRAINT "share_transactions_accountId_fkey" 
    FOREIGN KEY ("accountId") REFERENCES "share_accounts"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index on accountId
CREATE INDEX IF NOT EXISTS "share_transactions_accountId_idx" ON "share_transactions"("accountId");

-- Add unique constraint on cooperativeId and transactionNo
CREATE UNIQUE INDEX IF NOT EXISTS "share_transactions_cooperativeId_transactionNo_key" 
    ON "share_transactions"("cooperativeId", "transactionNo");

-- Drop old share_ledgers table and its constraints
DROP TABLE IF EXISTS "share_ledgers" CASCADE;

