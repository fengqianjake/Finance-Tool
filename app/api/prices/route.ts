import { NextRequest, NextResponse } from 'next/server';
import { ensureSeedTickers, getHistoryForSymbol, getLatestSnapshots, getTrackedTickers } from '../../lib/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');

  if (symbol) {
    const history = await getHistoryForSymbol(symbol, 100);
    return NextResponse.json(
      { symbol: symbol.toUpperCase(), history },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  await ensureSeedTickers();
  const tickers = await getTrackedTickers();
  const latest = await getLatestSnapshots(tickers);
  return NextResponse.json(
    { latest },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
