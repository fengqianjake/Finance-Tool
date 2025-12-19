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
 * Convert user input into Stooq symbol format.
 * If user types "AAPL" => "aapl.us"
 * If user types "VOO"  => "voo.us"
 * If user already typed something with "." (like "BMW.DE"), keep it.
 */
function toStooqSymbol(symbol: string): string {
  const s = symbol.trim().toLowerCase();
  if (!s) return '';
  if (s.includes('.')) return s; // assume already stooq-style or has suffix
  return `${s}.us`;
}

/**
 * Fetch latest price from Stooq (no cookies/crumb; reliable on Vercel).
 * Stooq CSV example:
 * https://stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcv&h&e=csv
 */
async function fetchStooqQuote(symbol: string): Promise<Quote | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  const stooqSymbol = toStooqSymbol(normalized);
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`[pricing] stooq http ${res.status} for ${normalized}`);
      return null;
    }

    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;

    // header: Symbol,Date,Time,Open,High,Low,Close,Volume
    const row = lines[1].split(',');
    const closeStr = row[6]; // Close
    const close = closeStr ? Number(closeStr) : NaN;

    if (!Number.isFinite(close)) {
      // When Stooq doesn't know the symbol, it often returns "N/D"
      console.error(`[pricing] stooq returned no close for ${normalized}: ${lines[1]}`);
      return null;
    }

    // Very rough currency assumption: ".us" => USD
    const currency = stooqSymbol.endsWith('.us') ? 'USD' : null;

    return {
      symbol: normalized,
      currency,
      regularMarketPrice: close,
      regularMarketChange: null,
      regularMarketChangePercent: null
    };
  } catch (err) {
    console.error(`[pricing] stooq fetch failed for ${normalized}`, err);
    return null;
  }
}

/**
 * Main quote function used by cron.
 * (We keep the same shape so the rest of your app/DB stays unchanged.)
 */
export async function fetchQuote(symbol: string): Promise<Quote | null> {
  return fetchStooqQuote(symbol);
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
 */
export async function fetchAndStoreSnapshots(symbols: string[]): Promise<Snapshot[]> {
  const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).filter(Boolean);
  const results: Snapshot[] = [];

  // Stable daily key (00:00 UTC) so reruns are idempotent
  const asOfDate = new Date();
  asOfDate.setUTCHours(0, 0, 0, 0);

  for (const symbol of uniqueSymbols) {
    const quote = await fetchQuote(symbol);
    if (quote?.regularMarketPrice == null) continue;

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
        // keep fields even if null in schema; store undefined to avoid overwriting with null
        change: quote.regularMarketChange ?? undefined,
        changePercent: quote.regularMarketChangePercent ?? undefined,
        source: 'stooq'
      },
      create: {
        symbol,
        currency: quote.currency ?? undefined,
        price: new Prisma.Decimal(quote.regularMarketPrice),
        change: quote.regularMarketChange ?? undefined,
        changePercent: quote.regularMarketChangePercent ?? undefined,
        source: 'stooq',
        asOfDate
      }
    });

    results.push(record as Snapshot);
  }

  return results;
}

export async function getLatestSnapshots(symbols?: string[]): Promise<Snapshot[]> {
  const list = symbols && symbols.length > 0 ? symbols : await getTrackedTickers();
  if (!list || list.length === 0) return [];

  const records = await prisma.priceSnapshot.findMany({
    where: { symbol: { in: list.map((s) => s.toUpperCase()) } },
    orderBy: [{ asOfDate: 'desc' }, { createdAt: 'desc' }]
  });

  const seen = new Set<string>();
  const latest: Snapshot[] = [];
  for (const record of records) {
    if (!seen.has(record.symbol)) {
      seen.add(record.symbol);
      latest.push(record as Snapshot);
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
