-- AlterTable
ALTER TABLE "saving_products" ADD COLUMN "interestPostingFrequency" TEXT NOT NULL DEFAULT 'QUARTERLY',
ADD COLUMN "interestCalculationMethod" TEXT NOT NULL DEFAULT 'DAILY_BALANCE',
ADD COLUMN "isTaxApplicable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 6.0;

-- AlterTable
ALTER TABLE "saving_accounts" ADD COLUMN "lastInterestCalculatedDate" TIMESTAMP(3),
ADD COLUMN "lastInterestPostedDate" TIMESTAMP(3),
ADD COLUMN "nominee" JSONB;

