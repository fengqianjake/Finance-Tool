import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEARCH_ENDPOINT = 'https://query1.finance.yahoo.com/v1/finance/search';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();

  if (query.length < 2) {
    return NextResponse.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'portfolio-portal' },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const data = await response.json();
    const results = Array.isArray(data.quotes)
      ? data.quotes.map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchange,
          currency: q.currency
        }))
      : [];

    return NextResponse.json({ results: results.slice(0, 12) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.warn('[symbols] search failed', error);
    return NextResponse.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
