import yahooFinance from 'yahoo-finance2';
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
  price: number;
  change?: number | null;
  changePercent?: number | null;
  createdAt: Date;
};

export const TICKERS = (process.env.TICKERS || '')
  .split(',')
  .map((t) => t.trim().toUpperCase())
  .filter(Boolean);

export async function fetchQuote(symbol: string): Promise<Quote | null> {
  try {
    const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'summaryDetail'] });
    return {
      symbol,
      currency: quote.price?.currency || quote.summaryDetail?.currency,
      regularMarketPrice: quote.price?.regularMarketPrice ?? undefined,
      regularMarketChange: quote.price?.regularMarketChange ?? undefined,
      regularMarketChangePercent: quote.price?.regularMarketChangePercent ?? undefined
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
  const tickers = await prisma.ticker.findMany({ select: { symbol: true }, orderBy: { createdAt: 'asc' } });
  return tickers.map((t) => t.symbol.toUpperCase());
}

export async function ensureSeedTickers(): Promise<string[]> {
  const count = await prisma.ticker.count();
  if (count === 0 && TICKERS.length > 0) {
    await prisma.ticker.createMany({
      data: TICKERS.map((symbol) => ({ symbol })),
      skipDuplicates: true
    });
  }
  return getTrackedTickers();
}

export async function fetchAndStoreSnapshots(symbols: string[]): Promise<Snapshot[]> {
  const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.toUpperCase())));
  const results: Snapshot[] = [];

  for (const symbol of uniqueSymbols) {
    const quote = await fetchQuote(symbol);
    if (!quote?.regularMarketPrice) {
      continue;
    }

    const created = await prisma.priceSnapshot.create({
      data: {
        symbol: symbol.toUpperCase(),
        currency: quote.currency || undefined,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange ?? undefined,
        changePercent: quote.regularMarketChangePercent ?? undefined
      }
    });

    results.push(created);
  }

  return results;
}

export async function getLatestSnapshots(symbols?: string[]): Promise<Snapshot[]> {
  const list = symbols && symbols.length > 0 ? symbols : await getTrackedTickers();
  if (!list || list.length === 0) {
    return [];
  }
  const records = await prisma.priceSnapshot.findMany({
    where: { symbol: { in: list.map((s) => s.toUpperCase()) } },
    orderBy: { createdAt: 'desc' }
  });

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
