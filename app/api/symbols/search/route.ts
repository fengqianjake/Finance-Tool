import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEARCH_ENDPOINT = 'https://query1.finance.yahoo.com/v1/finance/search';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();

  if (!query || query.length < 1) {
    return NextResponse.json({ error: 'Query must be at least 1 character.' }, {
      status: 400,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  try {
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'nextjs-pricing-portal' },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch symbols' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }

    const data = await response.json();
    const results = Array.isArray(data.quotes)
      ? data.quotes.map((q: any) => ({
          symbol: q.symbol,
          shortname: q.shortname,
          longname: q.longname,
          exchange: q.exchange,
          quoteType: q.quoteType,
          currency: q.currency
        }))
      : [];

    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[symbols] search failed', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
