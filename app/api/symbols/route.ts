import { NextResponse } from 'next/server';
import { ensureSeedTickers, getTrackedTickers } from '../../lib/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_ASSETS = [
  { symbol: 'BTC-USD', label: 'Bitcoin (BTC-USD)' },
  { symbol: 'GC=F', label: 'Gold (GC=F)' },
  { symbol: 'SI=F', label: 'Silver (SI=F)' }
];

const COMMON_SYMBOLS = [
  { symbol: 'AAPL', label: 'Apple (AAPL)' },
  { symbol: 'MSFT', label: 'Microsoft (MSFT)' },
  { symbol: 'GOOGL', label: 'Alphabet (GOOGL)' },
  { symbol: 'AMZN', label: 'Amazon (AMZN)' },
  { symbol: 'NVDA', label: 'NVIDIA (NVDA)' },
  { symbol: 'META', label: 'Meta (META)' },
  { symbol: 'TSLA', label: 'Tesla (TSLA)' },
  { symbol: 'JPM', label: 'JPMorgan Chase (JPM)' },
  { symbol: 'V', label: 'Visa (V)' },
  { symbol: 'VOO', label: 'Vanguard S&P 500 ETF (VOO)' },
  { symbol: 'SPY', label: 'SPDR S&P 500 ETF (SPY)' },
  { symbol: 'QQQ', label: 'Invesco QQQ Trust (QQQ)' }
];

export async function GET() {
  await ensureSeedTickers();
  const tracked = await getTrackedTickers();
  const options = new Map<string, { symbol: string; label: string }>();

  function addOption(symbol: string, label?: string) {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized || options.has(normalized)) return;
    options.set(normalized, { symbol: normalized, label: label || normalized });
  }

  COMMON_SYMBOLS.forEach((item) => addOption(item.symbol, item.label));
  DEFAULT_ASSETS.forEach((item) => addOption(item.symbol, item.label));
  tracked.forEach((symbol) => addOption(symbol, `${symbol} (${symbol})`));

  return NextResponse.json({ symbols: Array.from(options.values()) }, { headers: { 'Cache-Control': 'no-store' } });
}
