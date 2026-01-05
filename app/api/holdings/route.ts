import { NextRequest, NextResponse } from 'next/server';
import { AssetClass, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { defaultSymbolForAsset, getOrCreatePortfolio, getPortfolioSnapshot } from '../../lib/portfolio';
import { upsertTicker } from '../../lib/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isValidAssetClass(input: string): input is AssetClass {
  return (Object.keys(AssetClass) as Array<keyof typeof AssetClass>).some((key) => AssetClass[key] === input);
}

export async function GET() {
  const snapshot = await getPortfolioSnapshot();
  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assetClass, symbol, units } = body as { assetClass?: string; symbol?: string; units?: number | string };
    if (!assetClass || !isValidAssetClass(assetClass)) {
      return NextResponse.json({ error: 'Invalid asset class' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
    const normalizedAssetClass = assetClass as AssetClass;

    const parsedUnits = typeof units === 'string' ? Number(units) : units;
    if (parsedUnits === undefined || parsedUnits === null || Number.isNaN(parsedUnits) || parsedUnits <= 0) {
      return NextResponse.json({ error: 'Units must be greater than 0' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const portfolio = await getOrCreatePortfolio();
    const symbolInput = typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';
    const requiresSymbol = normalizedAssetClass === 'STOCK' || normalizedAssetClass === 'ETF';
    const isCash =
      normalizedAssetClass === 'CASH_USD' || normalizedAssetClass === 'CASH_EUR' || normalizedAssetClass === 'CASH_CNY';

    if (requiresSymbol && !symbolInput) {
      return NextResponse.json({ error: 'Symbol is required for stocks and ETFs' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const storedSymbol = isCash ? null : symbolInput || null;
    const resolvedSymbol = defaultSymbolForAsset(normalizedAssetClass, storedSymbol);
    if (resolvedSymbol) {
      await upsertTicker(resolvedSymbol);
    }

    const holding = await prisma.holding.create({
      data: {
        assetClass: normalizedAssetClass,
        symbol: storedSymbol,
        units: new Prisma.Decimal(parsedUnits),
        portfolioId: portfolio.id
      }
    });

    return NextResponse.json({ ok: true, holdingId: holding.id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[holdings] failed to create holding', error);
    return NextResponse.json({ error: 'Failed to save holding' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing holding id' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    await prisma.holding.delete({ where: { id } });
  } catch (error) {
    console.error('[holdings] failed to delete', error);
  }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
