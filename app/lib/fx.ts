import prisma from './prisma';
import { FxRateSnapshot } from '@prisma/client';

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'CNY'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function fetchFrankfurterRates() {
  const url = 'https://api.frankfurter.app/latest?from=EUR&to=USD,CNY';
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-store' } });
  if (!res.ok) {
    throw new Error(`Frankfurter rates failed with status ${res.status}`);
  }
  return res.json() as Promise<{ rates: Record<string, number>; date: string; base: string }>;
}

export async function refreshFxRates() {
  const asOfDate = startOfUtcDay();
  try {
    const data = await fetchFrankfurterRates();
    const entries = [
      { baseCurrency: 'EUR', quoteCurrency: 'EUR', rate: 1, source: 'frankfurter' },
      ...Object.entries(data.rates).map(([quoteCurrency, rate]) => ({
        baseCurrency: 'EUR',
        quoteCurrency,
        rate,
        source: 'frankfurter'
      }))
    ];

    for (const entry of entries) {
      await prisma.fxRateSnapshot.upsert({
        where: {
          baseCurrency_quoteCurrency_asOfDate: {
            baseCurrency: entry.baseCurrency,
            quoteCurrency: entry.quoteCurrency,
            asOfDate
          }
        },
        update: { rate: entry.rate, source: entry.source },
        create: { ...entry, asOfDate }
      });
    }

    return { count: entries.length, asOfDate };
  } catch (error) {
    console.error('[fx] failed to refresh FX rates', error);
    return { count: 0, asOfDate };
  }
}

export async function getLatestFxRates(): Promise<{ rates: FxRateSnapshot[]; latestAsOf: Date | null }> {
  const snapshots = await prisma.fxRateSnapshot.findMany({ orderBy: { asOfDate: 'desc' } });
  const seen = new Set<string>();
  const latest: FxRateSnapshot[] = [];

  for (const snap of snapshots) {
    const key = `${snap.baseCurrency}-${snap.quoteCurrency}`;
    if (!seen.has(key)) {
      seen.add(key);
      latest.push(snap);
    }
  }

  const latestAsOf = snapshots.length > 0 ? snapshots[0].asOfDate : null;
  return { rates: latest, latestAsOf };
}

function rateLookup(
  from: string,
  to: string,
  rateMap: Map<string, number>,
  visited = new Set<string>()
): number | null {
  if (from === to) return 1;
  const directKey = `${from}->${to}`;
  if (rateMap.has(directKey)) {
    return rateMap.get(directKey) ?? null;
  }
  const inverseKey = `${to}->${from}`;
  if (rateMap.has(inverseKey)) {
    const inverse = rateMap.get(inverseKey);
    return inverse ? 1 / inverse : null;
  }

  // Attempt triangulation through EUR to keep paths simple.
  if (visited.has(from)) return null;
  visited.add(from);
  const via = 'EUR';
  if (from !== via && to !== via) {
    const toVia = rateLookup(from, via, rateMap, visited);
    const fromVia = rateLookup(via, to, rateMap, visited);
    if (toVia && fromVia) {
      return toVia * fromVia;
    }
  }

  return null;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRateSnapshot[]
): number | null {
  if (!Number.isFinite(amount)) return null;
  if (fromCurrency === toCurrency) return amount;
  const map = new Map<string, number>();
  for (const rate of rates) {
    map.set(`${rate.baseCurrency}->${rate.quoteCurrency}`, Number(rate.rate));
  }
  const computed = rateLookup(fromCurrency, toCurrency, map);
  if (!computed) return null;
  return amount * computed;
}
