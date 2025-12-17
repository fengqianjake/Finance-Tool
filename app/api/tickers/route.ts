import { NextRequest, NextResponse } from 'next/server';
import { ensureSeedTickers, getTrackedTickers, upsertTicker } from '../../lib/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const ticker = await upsertTicker(symbol);
  return NextResponse.json({ ticker }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET() {
  await ensureSeedTickers();
  const tickers = await getTrackedTickers();
  return NextResponse.json({ tickers }, { headers: { 'Cache-Control': 'no-store' } });
}
