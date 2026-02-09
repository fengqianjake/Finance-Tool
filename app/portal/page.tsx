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
      {/* Portfolio Value & Holdings */}
      <PortfolioPortal initialSnapshot={initialSnapshot} />
      
      {/* Add Holding Form */}
      <TickerDropdown />
      
      {/* Tracked Tickers */}
      <section className="card">
        <h2 style={{ margin: '4px 0', fontSize: 18, fontWeight: 600 }}>Tracked tickers</h2>
        <p className="muted" style={{ margin: '0 0 12px 0', fontSize: 14 }}>
          View price details for tracked symbols
        </p>
        
        {tickers.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>No tickers tracked yet.</p>
        ) : (
          <TrackedTickerDropdown tickers={trackedOptions} />
        )}
        
        <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
          Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'No data'}
        </p>
        
        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <Link className="button secondary" href="/">View all prices</Link>
          <Link className="button secondary" href="/api/holdings" prefetch={false}>Export JSON</Link>
        </div>
      </section>
    </div>
  );
}
