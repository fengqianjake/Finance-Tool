import Link from 'next/link';
import { getHistoryForSymbol } from '../../lib/pricing';
import LineChart from '../../../src/components/LineChart';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatNumber(value?: number | null, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default async function TickerPage({ params }: { params: { symbol: string } }) {
  const history = await getHistoryForSymbol(params.symbol, 60);
  const latest = history[0];
  const points = history.map((h) => ({ x: h.createdAt, y: h.price })).reverse();

  return (
    <div className="grid">
      <Link href="/" className="button secondary" style={{ width: 'fit-content' }}>
        ← Back
      </Link>
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <h2 style={{ margin: '4px 0' }}>{params.symbol.toUpperCase()}</h2>
            <p className="muted" style={{ margin: 0 }}>Latest price and the last {history.length} snapshots.</p>
          </div>
          <Link className="button" href={`/api/prices?symbol=${params.symbol}`} prefetch={false}>Download data</Link>
        </div>

        {latest ? (
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <div className="tile">
              <span className="muted">Price</span>
              <strong style={{ fontSize: 28 }}>{formatNumber(latest.price)}</strong>
              <span className="muted">Currency: {latest.currency ?? '—'}</span>
            </div>
            <div className="tile">
              <span className="muted">Last updated</span>
              <strong style={{ fontSize: 20 }}>{new Date(latest.createdAt).toLocaleString()}</strong>
              <span className="muted">Change: {latest.changePercent !== null && latest.changePercent !== undefined ? `${formatNumber(latest.changePercent)}%` : formatNumber(latest.change)}</span>
            </div>
          </div>
        ) : (
          <p className="muted">No data yet for this symbol. Add it via the search box on the home page and wait for the next daily refresh.</p>
        )}

        <div style={{ marginTop: 24 }}>
          <LineChart points={points.map((p) => ({ x: new Date(p.x), y: p.y }))} />
        </div>
      </section>
    </div>
  );
}
