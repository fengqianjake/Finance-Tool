import Link from 'next/link';
import { getPortfolioSnapshot } from '../lib/portfolio';
import { ensureSeedTickers, getLatestSnapshots, getTrackedTickers } from '../lib/pricing';
import PortfolioPortal, { ClientPortfolioSnapshot } from '../../src/components/PortfolioPortal';
import TickerDropdown from '../../src/components/TickerDropdown';
import TrackedTickerDropdown from '../../src/components/TrackedTickerDropdown';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PortalPage() {
  const snapshot = await getPortfolioSnapshot();
  await ensureSeedTickers();
  const tickers = await getTrackedTickers();
  const snapshots = await getLatestSnapshots(tickers);
  const lastUpdated = snapshots.length > 0 ? snapshots.reduce((latest, snap) => Math.max(latest, snap.createdAt.getTime()), 0) : null;
  const snapshotMap = new Map(snapshots.map((snap) => [snap.symbol, snap]));
  const trackedOptions = tickers.map((symbol) => {
    const snap = snapshotMap.get(symbol);
    return {
      symbol,
      price: snap?.price ?? null,
      currency: snap?.currency ?? null,
      updatedAt: snap?.createdAt ? snap.createdAt.toISOString() : null
    };
  });
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
        {/* What changed: added a searchable holdings add-on and a foldable holdings list with auto-refresh on stale prices. */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <Link className="button" href="/">View ticker overview</Link>
          <Link className="button secondary" href="/api/holdings" prefetch={false}>Download holdings</Link>
        </div>
      </section>
      <TickerDropdown />
      <PortfolioPortal initialSnapshot={initialSnapshot} />
      <section className="card">
        <h2 style={{ margin: '4px 0' }}>Tracked tickers</h2>
        <p className="muted" style={{ margin: 0 }}>Choose a ticker to view its latest price details.</p>
        {tickers.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>Add symbols from the dropdown on the homepage to start tracking.</p>
        ) : (
          <div style={{ marginTop: 12 }}>
            <TrackedTickerDropdown tickers={trackedOptions} />
          </div>
        )}
        <p className="muted" style={{ marginTop: 12 }}>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'No data yet — add tickers to begin.'}</p>
      </section>
    </div>
  );
}
