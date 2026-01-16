import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEARCH_ENDPOINT = 'https://query1.finance.yahoo.com/v1/finance/search';

type SymbolResult = {
  symbol: string;
  name: string;
  exchange?: string;
  currency?: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();

  if (query.length < 2) {
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'portfolio-portal' },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
    }

    const data = await response.json();
    const results: SymbolResult[] = Array.isArray(data.quotes)
      ? data.quotes.map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          exchange: quote.exchange,
          currency: quote.currency
        }))
      : [];

    return NextResponse.json(results.slice(0, 12), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.warn('[symbols] search failed', error);
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
  }
}
