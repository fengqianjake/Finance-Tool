import { NextRequest, NextResponse } from 'next/server';
import tickers from '../../../data/tickers.json';
import { upsertTicker } from '../../lib/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TickerEntry = {
  symbol: string;
  name: string;
  assetClass: string;
};

function normalize(input: string) {
  return input.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const ticker = await upsertTicker(symbol);
  return NextResponse.json({ ticker }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = normalize(searchParams.get('q') || '');
  const list = tickers as TickerEntry[];

  const results = query
    ? list.filter((entry) => normalize(entry.symbol).includes(query) || normalize(entry.name).includes(query))
    : list;

  return NextResponse.json({ results: results.slice(0, 25) }, { headers: { 'Cache-Control': 'no-store' } });
}
