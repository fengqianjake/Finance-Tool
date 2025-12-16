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

export const TICKERS = (process.env.TICKERS || '').split(',').map((t) => t.trim()).filter(Boolean);

export async function fetchQuote(symbol: string): Promise<Quote | null> {
  try {
    const quote = await yahooFinance.quote(symbol, { modules: ['price', 'summaryDetail'] });
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

export async function fetchAndStoreSnapshots(symbols: string[]): Promise<Snapshot[]> {
  const results: Snapshot[] = [];

  for (const symbol of symbols) {
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
  const list = symbols && symbols.length > 0 ? symbols : TICKERS;
  if (!list || list.length === 0) {
    return [];
  }
  const records = await prisma.priceSnapshot.findMany({
    where: list ? { symbol: { in: list.map((s) => s.toUpperCase()) } } : undefined,
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
