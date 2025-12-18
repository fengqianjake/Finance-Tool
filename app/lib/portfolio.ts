import { AssetClass, Holding, Portfolio } from '@prisma/client';
import prisma from './prisma';
import { convertCurrency, getLatestFxRates, SupportedCurrency } from './fx';
import { getLatestSnapshots } from './pricing';

export type HoldingView = {
  id: string;
  assetClass: AssetClass;
  symbol: string | null;
  resolvedSymbol: string | null;
  units: number;
  valueCurrency: string | null;
  valueInDisplay: number | null;
  pricePerUnit: number | null;
  priceAt: Date | null;
  note?: string;
};

export type PortfolioSnapshot = {
  holdings: HoldingView[];
  totalValue: number;
  displayCurrency: SupportedCurrency;
  priceLastUpdated: Date | null;
  fxLastUpdated: Date | null;
};

const DEFAULT_DISPLAY_CURRENCY: SupportedCurrency = 'USD';

export function resolveDisplayCurrency(input?: string | null): SupportedCurrency {
  const upper = (input || '').toUpperCase();
  return upper === 'EUR' || upper === 'CNY' ? (upper as SupportedCurrency) : DEFAULT_DISPLAY_CURRENCY;
}

export function defaultSymbolForAsset(assetClass: AssetClass, symbol?: string | null): string | null {
  if (symbol && symbol.trim()) return symbol.trim().toUpperCase();
  switch (assetClass) {
    case 'GOLD':
      return 'GC=F';
    case 'SILVER':
      return 'SI=F';
    case 'BITCOIN':
      return 'BTC-USD';
    default:
      return null;
  }
}

export function currencyForAsset(assetClass: AssetClass): string | null {
  switch (assetClass) {
    case 'CASH_USD':
      return 'USD';
    case 'CASH_EUR':
      return 'EUR';
    case 'CASH_CNY':
      return 'CNY';
    default:
      return null;
  }
}

export async function getOrCreatePortfolio(): Promise<Portfolio> {
  const existing = await prisma.portfolio.findFirst();
  if (existing) return existing;
  return prisma.portfolio.create({ data: { displayCurrency: DEFAULT_DISPLAY_CURRENCY } });
}

export async function updateDisplayCurrency(preferred: string) {
  const displayCurrency = resolveDisplayCurrency(preferred);
  const portfolio = await getOrCreatePortfolio();
  return prisma.portfolio.update({ where: { id: portfolio.id }, data: { displayCurrency } });
}

async function listHoldings(): Promise<Holding[]> {
  return prisma.holding.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function getPortfolioSnapshot(preferredCurrency?: string): Promise<PortfolioSnapshot> {
  const portfolio = await getOrCreatePortfolio();
  const displayCurrency = resolveDisplayCurrency(preferredCurrency || portfolio.displayCurrency);
  const holdings = await listHoldings();

  const priceSymbols = holdings
    .map((h) => defaultSymbolForAsset(h.assetClass, h.symbol))
    .filter((s): s is string => Boolean(s));
  const priceSnapshots = priceSymbols.length > 0 ? await getLatestSnapshots(priceSymbols) : [];
  const priceMap = new Map(priceSnapshots.map((p) => [p.symbol, p]));
  const { rates: fxRates, latestAsOf: fxLastUpdated } = await getLatestFxRates();

  let priceLastUpdated: Date | null = null;
  const holdingViews: HoldingView[] = holdings.map((holding) => {
    const resolvedSymbol = defaultSymbolForAsset(holding.assetClass, holding.symbol);
    const units = Number(holding.units);
    let valueCurrency: string | null = currencyForAsset(holding.assetClass);
    let pricePerUnit: number | null = null;
    let priceAt: Date | null = null;
    let rawValue: number | null = null;
    let note: string | undefined;

    if (holding.assetClass === 'STOCK' || holding.assetClass === 'ETF' || holding.assetClass === 'BITCOIN' || holding.assetClass === 'GOLD' || holding.assetClass === 'SILVER') {
      if (resolvedSymbol && priceMap.has(resolvedSymbol)) {
        const snap = priceMap.get(resolvedSymbol)!;
        pricePerUnit = snap.price.toNumber();
        valueCurrency = snap.currency || 'USD';
        priceAt = snap.createdAt;
        priceLastUpdated = priceLastUpdated ? new Date(Math.max(priceLastUpdated.getTime(), snap.createdAt.getTime())) : snap.createdAt;
        rawValue = units * pricePerUnit;
      } else {
        rawValue = 0;
        note = 'No price yet';
        valueCurrency = valueCurrency || 'USD';
      }
    } else {
      rawValue = units;
    }

    const converted = valueCurrency ? convertCurrency(rawValue ?? 0, valueCurrency, displayCurrency, fxRates) : rawValue;
    const valueInDisplay = converted ?? (valueCurrency === displayCurrency ? rawValue : null);

    return {
      id: holding.id,
      assetClass: holding.assetClass,
      symbol: holding.symbol,
      resolvedSymbol,
      units,
      valueCurrency,
      valueInDisplay,
      pricePerUnit,
      priceAt,
      note
    };
  });

  const totalValue = holdingViews.reduce((acc, h) => acc + (h.valueInDisplay ?? 0), 0);

  return {
    holdings: holdingViews,
    totalValue,
    displayCurrency,
    priceLastUpdated,
    fxLastUpdated
  };
}
