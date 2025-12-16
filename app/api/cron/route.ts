import { NextResponse } from 'next/server';
import { fetchAndStoreSnapshots, TICKERS } from '../../lib/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const isProd = process.env.VERCEL_ENV === 'production';
  const allowNonProd = process.env.ALLOW_CRON === 'true';
  if (!isProd && !allowNonProd) {
    return new NextResponse('Cron disabled outside production. Set ALLOW_CRON=true to override locally.', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  if (!TICKERS || TICKERS.length === 0) {
    return new NextResponse('No tickers configured. Set TICKERS env var.', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  console.log(`[cron] starting price capture for ${TICKERS.join(', ')} at ${new Date().toISOString()}`);
  const snapshots = await fetchAndStoreSnapshots(TICKERS);
  console.log(`[cron] completed with ${snapshots.length} snapshots`);

  return NextResponse.json(
    { captured: snapshots.length, symbols: snapshots.map((s) => s.symbol), at: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
