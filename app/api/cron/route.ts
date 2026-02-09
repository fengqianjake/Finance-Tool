import { NextResponse } from 'next/server';
import { ensureSeedTickers, fetchAndStoreSnapshots, getTrackedTickers } from '../../lib/pricing';
import { refreshFxRates } from '../../lib/fx';
import prisma from '../../lib/prisma';
import { defaultSymbolForAsset } from '../../lib/portfolio';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const isProd = process.env.VERCEL_ENV === 'production';
    const allowNonProd = process.env.ALLOW_CRON === 'true';
    if (!isProd && !allowNonProd) {
      return new NextResponse('Automatic refresh is disabled in this environment.', { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }

    const fxResult = await refreshFxRates();

    await ensureSeedTickers();
    const trackedTickers = await getTrackedTickers();
    const holdings = await prisma.holding.findMany({ select: { assetClass: true, symbol: true } });
    const symbolSet = new Set<string>(trackedTickers.map((ticker) => ticker.toUpperCase()));
    holdings.forEach((holding) => {
      const resolved = defaultSymbolForAsset(holding.assetClass, holding.symbol);
      if (resolved) symbolSet.add(resolved.toUpperCase());
    });
    const tickers = Array.from(symbolSet);
    if (tickers.length === 0) {
      return new NextResponse('No tickers configured. Add tickers in the app first.', { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    console.log(`[cron] starting price capture for ${tickers.join(', ')} at ${new Date().toISOString()}`);
    const snapshots = await fetchAndStoreSnapshots(tickers);
    console.log(`[cron] completed with ${snapshots.length} snapshots`);
    console.log(`[cron] FX refresh stored ${fxResult.count} rates for ${fxResult.asOfDate.toISOString().slice(0, 10)}`);

    return NextResponse.json(
      {
        captured: snapshots.length,
        symbols: snapshots.map((s) => s.symbol),
        fxRates: fxResult.count,
        fxAsOf: fxResult.asOfDate,
        at: new Date().toISOString()
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('[cron] fatal error:', error);
    return NextResponse.json(
      { error: error?.message || 'Unknown error', stack: error?.stack },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
