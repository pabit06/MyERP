-- CreateTable
CREATE TABLE "product_gl_maps" (
    "id" TEXT NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "principalGLCode" TEXT,
    "interestIncomeGLCode" TEXT,
    "penaltyIncomeGLCode" TEXT,
    "depositGLCode" TEXT,
    "interestExpenseGLCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_gl_maps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_gl_maps_cooperativeId_productType_productId_key" ON "product_gl_maps"("cooperativeId", "productType", "productId");

-- CreateIndex
CREATE INDEX "product_gl_maps_productType_productId_idx" ON "product_gl_maps"("productType", "productId");

-- AddForeignKey
ALTER TABLE "product_gl_maps" ADD CONSTRAINT "product_gl_maps_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "cooperatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

