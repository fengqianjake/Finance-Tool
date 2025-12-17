import yahooFinance from 'yahoo-finance2';
import { Prisma } from '@prisma/client';
import prisma from './prisma';

type Quote = {
  symbol: string;
  currency?: string | null;
  regularMarketPrice?: number | null;
};

export type Snapshot = {
  symbol: string;
  currency?: string | null;
  price: Prisma.Decimal;
  source: string;
  asOfDate: Date;
  createdAt: Date;
};

/**
 * IMPORTANT: Read env at runtime (inside a function), not at module load.
 * This avoids cases where serverless bundles capture an empty value.
 */
export function getEnvTickers(): string[] {
  return (process.env.TICKERS || '')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

export async function fetchQuote(symbol: string): Promise<Quote | null> {
  try {
    const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'summaryDetail'] });
    return {
      symbol,
      currency: quote.price?.currency || quote.summaryDetail?.currency,
      regularMarketPrice: quote.price?.regularMarketPrice ?? undefined
    };
  } catch (error) {
    console.error(`[pricing] failed to fetch quote for ${symbol}`, error);
    return null;
  }
}

export async function upsertTicker(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  return prisma.ticker.upsert({
    where: { symbol: normalized },
    update: {},
    create: { symbol: normalized }
  });
}

export async function getTrackedTickers(): Promise<string[]> {
  const tickers = await prisma.ticker.findMany({
    select: { symbol: true },
    orderBy: { createdAt: 'asc' }
  });

  return tickers.map((t) => t.symbol.toUpperCase());
}

/**
 * Seed tickers from TICKERS env var if DB is empty.
 * Returns the tracked tickers from DB (authoritative source for the app).
 */
export async function ensureSeedTickers(): Promise<string[]> {
  const count = await prisma.ticker.count();
  const envTickers = getEnvTickers();

  if (count === 0 && envTickers.length > 0) {
    await prisma.ticker.createMany({
      data: envTickers.map((symbol) => ({ symbol })),
      skipDuplicates: true
    });
  }

  return getTrackedTickers();
}

/**
 * Stores ONE snapshot per symbol per day (UTC) using the schema:
 * PriceSnapshot(symbol, price, currency?, source, asOfDate, createdAt)
 *
 * Requires a unique constraint on (symbol, asOfDate) with name/shape:
 * @@unique([symbol, asOfDate])
 */
export async function fetchAndStoreSnapshots(symbols: string[]): Promise<Snapshot[]> {
  const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).filter(Boolean);
  const results: Snapshot[] = [];

  // Stable daily key (00:00 UTC)
  const asOfDate = new Date();
  asOfDate.setUTCHours(0, 0, 0, 0);

  for (const symbol of uniqueSymbols) {
    const quote = await fetchQuote(symbol);
    if (quote?.regularMarketPrice == null) continue;

    const created = await prisma.priceSnapshot.upsert({
      where: {
        symbol_asOfDate: {
          symbol: symbol.toUpperCase(),
          asOfDate
        }
      },
      update: {
        currency: quote.currency || undefined,
        price: new Prisma.Decimal(quote.regularMarketPrice),
        source: 'yahoo'
      },
      create: {
        symbol: symbol.toUpperCase(),
        currency: quote.currency || undefined,
        price: new Prisma.Decimal(quote.regularMarketPrice),
        source: 'yahoo',
        asOfDate
      }
    });

    results.push(created);
  }

  return results;
}

export async function getLatestSnapshots(symbols?: string[]): Promise<Snapshot[]> {
  const list = symbols && symbols.length > 0 ? symbols : await getTrackedTickers();
  if (!list || list.length === 0) return [];

  const records = await prisma.priceSnapshot.findMany({
    where: { symbol: { in: list.map((s) => s.toUpperCase()) } },
    orderBy: { createdAt: 'desc' }
  });

  // De-dupe by symbol (first record per symbol is latest because sorted desc)
  const seen = new Set<string>();
  const latest: Snapshot[] = [];

  for (const record of records) {
    if (!seen.has(record.symbol)) {
      seen.add(record.symbol);
      latest.push(record);
    }
  }

  return latest;
}

export async function getHistoryForSymbol(symbol: string, limit = 50): Promise<Snapshot[]> {
  return prisma.priceSnapshot.findMany({
    where: { symbol: symbol.toUpperCase() },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}
