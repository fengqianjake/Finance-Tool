-- CreateTable
CREATE TABLE "Ticker" (
    "id" TEXT PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticker_symbol_key" ON "Ticker"("symbol");
