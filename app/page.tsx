import Link from 'next/link';
import { getLatestSnapshots, TICKERS } from './lib/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatNumber(value?: number | null, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default async function HomePage() {
  const snapshots = await getLatestSnapshots();
  const lastUpdated = snapshots.length > 0 ? snapshots.reduce((latest, snap) => Math.max(latest, snap.createdAt.getTime()), 0) : null;

  return (
    <div className="grid grid-2">
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <h2 style={{ margin: '4px 0' }}>Tracked tickers</h2>
            <p className="muted" style={{ margin: 0 }}>Configured via <code>TICKERS</code>. Server fetches Yahoo Finance prices every 3 hours.</p>
          </div>
          <Link className="button" href="/api/cron" prefetch={false}>Run cron now</Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Price</th>
              <th>Change</th>
              <th>Currency</th>
              <th>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {TICKERS.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">Add comma-separated symbols to the <code>TICKERS</code> env var and redeploy.</td>
              </tr>
            )}
            {snapshots.map((snap) => {
              const change = snap.changePercent ?? snap.change;
              const isPercent = snap.changePercent !== null && snap.changePercent !== undefined;
              return (
                <tr key={snap.symbol}>
                  <td>
                    <Link href={`/tickers/${snap.symbol}`}>{snap.symbol}</Link>
                  </td>
                  <td>{formatNumber(snap.price)}</td>
                  <td style={{ color: change && change < 0 ? 'var(--danger)' : '#6ee7b7' }}>
                    {change === null || change === undefined ? '—' : isPercent ? `${formatNumber(change)}%` : formatNumber(change)}
                  </td>
                  <td>{snap.currency ?? '—'}</td>
                  <td className="muted">{new Date(snap.createdAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 12 }}>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'No data yet — trigger cron above.'}</p>
      </section>

      <section className="card">
        <h2 style={{ margin: '4px 0' }}>How it works</h2>
        <ul className="muted" style={{ lineHeight: 1.6 }}>
          <li>Symbols are configured in <code>TICKERS</code> (e.g. AAPL,MSFT,TSLA,BTC-USD).</li>
          <li>A Vercel Cron job calls the internal <code>/api/cron</code> route every 3 hours in production.</li>
          <li>Prices are fetched server-side via Yahoo Finance and stored in Postgres.</li>
          <li>The UI reads directly from the database (no caching) and exposes history per ticker.</li>
        </ul>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <Link className="button" href="/api/prices" prefetch={false}>View JSON feed</Link>
          <Link className="button secondary" href="https://github.com/vercel/docs/tree/main/examples/cron" target="_blank" rel="noreferrer">Cron docs</Link>
        </div>
      </section>
    </div>
  );
}
