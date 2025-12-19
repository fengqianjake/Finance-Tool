import yahooFinance from 'yahoo-finance2';
import { Prisma } from '@prisma/client';
import prisma from './prisma';

type Quote = {
  symbol: string;
  currency?: string | null;
  regularMarketPrice?: number | null;
  regularMarketChange?: number | null;
  regularMarketChangePercent?: number | null;
};

export type Snapshot = {
  symbol: string;
  currency?: string | null;
  price: Prisma.Decimal;
  change?: number | null;
  changePercent?: number | null;
  asOfDate: Date;
  createdAt: Date;
};

/**
 * Read env at runtime (important for serverless).
 */
export function getEnvTickers(): string[] {
  return (process.env.TICKERS || '')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * More reliable than quoteSummary for prices.
 * Works for AAPL, VOO, GC=F, SI=F, BTC-USD, etc.
 */
export async function fetchQuote(symbol: string): Promise<Quote | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  try {
    const q: any = await yahooFinance.quote(normalized);

    const price =
      q?.regularMarketPrice ??
      q?.postMarketPrice ??
      q?.preMarketPrice ??
      null;

    const currency = q?.currency ?? null;

    return {
      symbol: normalized,
      currency,
      regularMarketPrice: price,
      regularMarketChange: q?.regularMarketChange ?? null,
      regularMarketChangePercent: q?.regularMarketChangePercent ?? null
    };
  } catch (error) {
    console.error(`[pricing] failed to fetch quote for ${normalized}`, error);
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
 * Stores ONE snapshot per symbol per day (UTC).
 * Requires Prisma schema:
 *   asOfDate DateTime
 *   @@unique([symbol, asOfDate], name: "symbol_asOfDate")
 *   price Decimal
 */
export async function fetchAndStoreSnapshots(symbols: string[]): Promise<Snapshot[]> {
  const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()))).filter(Boolean);
  const results: Snapshot[] = [];

  // Stable daily key (00:00 UTC) so reruns are idempotent
  const asOfDate = new Date();
  asOfDate.setUTCHours(0, 0, 0, 0);

  for (const symbol of uniqueSymbols) {
    const quote = await fetchQuote(symbol);
    if (quote?.regularMarketPrice == null) {
      console.warn(`[pricing] no price for ${symbol}`);
      continue;
    }

    const record = await prisma.priceSnapshot.upsert({
      where: {
        symbol_asOfDate: {
          symbol,
          asOfDate
        }
      },
      update: {
        currency: quote.currency ?? undefined,
        price: new Prisma.Decimal(quote.regularMarketPrice),
        change: quote.regularMarketChange ?? undefined,
        changePercent: quote.regularMarketChangePercent ?? undefined,
        source: 'yahoo'
      },
      create: {
        symbol,
        currency: quote.currency ?? undefined,
        price: new Prisma.Decimal(quote.regularMarketPrice),
        change: quote.regularMarketChange ?? undefined,
        changePercent: quote.regularMarketChangePercent ?? undefined,
        source: 'yahoo',
        asOfDate
      }
    });

    results.push(record as unknown as Snapshot);
  }

  return results;
}

export async function getLatestSnapshots(symbols?: string[]): Promise<Snapshot[]> {
  const list = symbols && symbols.length > 0 ? symbols : await getTrackedTickers();
  if (!list || list.length === 0) return [];

  // newest first, then de-dupe by symbol
  const records = await prisma.priceSnapshot.findMany({
    where: { symbol: { in: list.map((s) => s.toUpperCase()) } },
    orderBy: [{ asOfDate: 'desc' }, { createdAt: 'desc' }]
  });

  const seen = new Set<string>();
  const latest: Snapshot[] = [];
  for (const record of records) {
    if (!seen.has(record.symbol)) {
      seen.add(record.symbol);
      latest.push(record as unknown as Snapshot);
    }
  }

  return latest;
}

export async function getHistoryForSymbol(symbol: string, limit = 50): Promise<Snapshot[]> {
  return prisma.priceSnapshot.findMany({
    where: { symbol: symbol.toUpperCase() },
    orderBy: [{ asOfDate: 'desc' }, { createdAt: 'desc' }],
    take: limit
  }) as unknown as Snapshot[];
}
