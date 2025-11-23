-- AlterTable
ALTER TABLE "chart_of_accounts" ADD COLUMN "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "nfrsMap" TEXT;

