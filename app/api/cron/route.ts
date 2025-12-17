import { NextResponse } from 'next/server';
import { ensureSeedTickers, fetchAndStoreSnapshots } from '../../lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/cron
 *
 * - Seeds tickers from TICKERS env var if DB is empty
 * - Captures ONE snapshot per symbol per day (UTC)
 * - Safe to call manually or from Vercel Cron
 */
export async function GET() {
  try {
    // ---- Guardrails ---------------------------------------------------------
    const isProd = process.env.VERCEL_ENV === 'production';
    const allowNonProd = process.env.ALLOW_CRON === 'true';

    if (!isProd && !allowNonProd) {
      return new NextResponse(
        'Cron disabled outside production. Set ALLOW_CRON=true to override.',
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // ---- Ensure tickers exist -----------------------------------------------
    const tickers = await ensureSeedTickers();

    if (!tickers || tickers.length === 0) {
      return NextResponse.json(
        {
          captured: 0,
          symbols: [],
          at: new Date().toISOString(),
          note: 'No tickers configured. Set TICKERS env var or add tickers via the UI.'
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    console.log(`[cron] capturing prices for: ${tickers.join(', ')}`);

    // ---- Capture prices -----------------------------------------------------
    const snapshots = await fetchAndStoreSnapshots(tickers);

    console.log(`[cron] completed: ${snapshots.length} snapshots`);

    return NextResponse.json(
      {
        captured: snapshots.length,
        symbols: tickers,
        at: new Date().toISOString()
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[cron] fatal error', error);

    return NextResponse.json(
      {
        error: 'Cron failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        at: new Date().toISOString()
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
