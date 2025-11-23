-- CreateTable
CREATE TABLE "member_number_sequences" (
    "id" TEXT NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_number_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_number_sequences_cooperativeId_key" ON "member_number_sequences"("cooperativeId");

-- AddForeignKey
ALTER TABLE "member_number_sequences" ADD CONSTRAINT "member_number_sequences_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "cooperatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

