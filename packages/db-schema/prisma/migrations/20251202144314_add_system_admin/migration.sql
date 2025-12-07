-- AlterTable
ALTER TABLE "users" ADD COLUMN "isSystemAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
-- Make cooperativeId nullable for system admins
ALTER TABLE "users" ALTER COLUMN "cooperativeId" DROP NOT NULL;

-- CreateIndex
-- Add index for system admin queries
CREATE INDEX "users_isSystemAdmin_idx" ON "users"("isSystemAdmin");

