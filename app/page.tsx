import Link from 'next/link';
import TickerSelect from '../src/components/TickerSelect';
import { ensureSeedTickers, getLatestSnapshots, getTrackedTickers } from './lib/pricing';
import { getPortfolioSnapshot } from './lib/portfolio';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatNumber(value?: number | null, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default async function HomePage() {
  await ensureSeedTickers();
  const portfolioSnapshot = await getPortfolioSnapshot();
  const tickers = await getTrackedTickers();
  const snapshots = await getLatestSnapshots(tickers);
  const lastUpdated = snapshots.length > 0 ? snapshots.reduce((latest, snap) => Math.max(latest, snap.createdAt.getTime()), 0) : null;
  const portfolioTotal = portfolioSnapshot.totalValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
    currency: portfolioSnapshot.displayCurrency
  });

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2 style={{ margin: '4px 0' }}>Portfolio total</h2>
        <p className="muted" style={{ margin: 0 }}>Aggregate value from the portfolio portal, converted to your preferred display currency.</p>
        <div className="badge" style={{ marginTop: 12 }}>Total value: {portfolioTotal}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <span className="muted">Display currency: {portfolioSnapshot.displayCurrency}</span>
          <span className="muted">Prices updated: {portfolioSnapshot.priceLastUpdated ? new Date(portfolioSnapshot.priceLastUpdated).toLocaleString() : '—'}</span>
          <span className="muted">FX updated: {portfolioSnapshot.fxLastUpdated ? new Date(portfolioSnapshot.fxLastUpdated).toLocaleString() : '—'}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <Link className="button" href="/portal">Open portfolio portal</Link>
        </div>
      </section>
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <h2 style={{ margin: '4px 0' }}>Tracked tickers</h2>
            <p className="muted" style={{ margin: 0 }}>Saved tickers refresh automatically each day.</p>
          </div>
          <Link className="button" href="/api/cron" prefetch={false}>Refresh prices now</Link>
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
            {tickers.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">Add symbols via the search box to start tracking.</td>
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
        <p className="muted" style={{ marginTop: 12 }}>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'No data yet — add tickers to begin.'}</p>
      </section>

      <TickerSelect />

      <section className="card">
        <h2 style={{ margin: '4px 0' }}>How it works</h2>
        <ul className="muted" style={{ lineHeight: 1.6 }}>
          <li>Use the search box to add any global symbol (equity/ETF/bond).</li>
          <li>Prices refresh automatically each day.</li>
          <li>Price history is stored so you can review past values.</li>
          <li>The portal shows each ticker with its latest stored price.</li>
        </ul>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <Link className="button" href="/api/prices" prefetch={false}>Download price data</Link>
        </div>
      </section>
    </div>
  );
}
