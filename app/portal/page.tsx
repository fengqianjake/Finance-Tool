import Link from 'next/link';
import { getPortfolioSnapshot } from '../lib/portfolio';
import { ensureSeedTickers, getLatestSnapshots, getTrackedTickers } from '../lib/pricing';
import PortfolioPortal, { ClientPortfolioSnapshot } from '../../src/components/PortfolioPortal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatNumber(value?: number | null, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default async function PortalPage() {
  const snapshot = await getPortfolioSnapshot();
  await ensureSeedTickers();
  const tickers = await getTrackedTickers();
  const snapshots = await getLatestSnapshots(tickers);
  const lastUpdated = snapshots.length > 0 ? snapshots.reduce((latest, snap) => Math.max(latest, snap.createdAt.getTime()), 0) : null;
  const initialSnapshot: ClientPortfolioSnapshot = {
    holdings: snapshot.holdings.map((h) => ({
      ...h,
      priceAt: h.priceAt ? h.priceAt.toISOString() : null
    })) as ClientPortfolioSnapshot['holdings'],
    totalValue: snapshot.totalValue,
    displayCurrency: snapshot.displayCurrency,
    priceLastUpdated: snapshot.priceLastUpdated ? snapshot.priceLastUpdated.toISOString() : null,
    fxLastUpdated: snapshot.fxLastUpdated ? snapshot.fxLastUpdated.toISOString() : null
  };

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ margin: '4px 0' }}>Portfolio portal</h1>
        <p className="muted" style={{ margin: 0 }}>
          Input holdings across asset classes, choose a display currency, and see totals using stored Yahoo Finance prices and daily FX rates.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <Link className="button" href="/">View ticker overview</Link>
          <Link className="button secondary" href="/api/holdings" prefetch={false}>
            Holdings JSON
          </Link>
        </div>
      </section>
      <PortfolioPortal initialSnapshot={initialSnapshot} />
      <section className="card">
        <h2 style={{ margin: '4px 0' }}>Tracked tickers</h2>
        <p className="muted" style={{ margin: 0 }}>Selections from the ticker dropdown appear here with their latest stored price.</p>
        <table style={{ marginTop: 12 }}>
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
                <td colSpan={5} className="muted">Add symbols from the dropdown on the homepage to start tracking.</td>
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
        <p className="muted" style={{ marginTop: 12 }}>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'No data yet — trigger cron after adding tickers.'}</p>
      </section>
    </div>
  );
}
