import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioSnapshot, updateDisplayCurrency } from '../../lib/portfolio';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const snapshot = await getPortfolioSnapshot();
  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { displayCurrency } = body as { displayCurrency?: string };
    if (!displayCurrency) {
      return NextResponse.json({ error: 'displayCurrency is required' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    await updateDisplayCurrency(displayCurrency);
    const snapshot = await getPortfolioSnapshot(displayCurrency);
    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[portfolio] failed to update display currency', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
