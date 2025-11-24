-- CreateTable
CREATE TABLE "generic_workflow_history" (
    "id" TEXT NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "workflowName" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "remarks" TEXT,
    "metadata" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generic_workflow_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generic_workflow_history_cooperativeId_idx" ON "generic_workflow_history"("cooperativeId");

-- CreateIndex
CREATE INDEX "generic_workflow_history_entityType_entityId_idx" ON "generic_workflow_history"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "generic_workflow_history_workflowName_idx" ON "generic_workflow_history"("workflowName");

-- CreateIndex
CREATE INDEX "generic_workflow_history_cooperativeId_entityType_entityId_idx" ON "generic_workflow_history"("cooperativeId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "generic_workflow_history_changedAt_idx" ON "generic_workflow_history"("changedAt");

-- AddForeignKey
ALTER TABLE "generic_workflow_history" ADD CONSTRAINT "generic_workflow_history_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "cooperatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generic_workflow_history" ADD CONSTRAINT "generic_workflow_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
