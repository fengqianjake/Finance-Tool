-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "currency" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "change" DOUBLE PRECISION,
    "changePercent" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'yahoo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PriceSnapshot_symbol_createdAt_idx" ON "PriceSnapshot"("symbol", "createdAt");
