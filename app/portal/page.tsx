import Link from 'next/link';
import { getPortfolioSnapshot } from '../lib/portfolio';
import { ensureSeedTickers, getLatestSnapshots, getTrackedTickers } from '../lib/pricing';
import Dashboard, { ClientPortfolioSnapshot } from '../../src/components/Dashboard';
import TickerDropdown from '../../src/components/TickerDropdown';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PortalPage() {
  const snapshot = await getPortfolioSnapshot();
  await ensureSeedTickers();
  const tickers = await getTrackedTickers();
  const snapshots = await getLatestSnapshots(tickers);
  const lastUpdated = snapshots.length > 0 ? snapshots.reduce((latest, snap) => Math.max(latest, snap.createdAt.getTime()), 0) : null;
  
  const initialSnapshot: ClientPortfolioSnapshot = {
    holdings: snapshot.holdings.map((h) => ({
      id: h.id,
      assetClass: h.assetClass,
      symbol: h.symbol,
      name: h.name,
      resolvedSymbol: h.resolvedSymbol,
      units: h.units,
      valueCurrency: h.valueCurrency,
      valueInDisplay: h.valueInDisplay,
      pricePerUnit: h.pricePerUnit,
      priceAt: h.priceAt ? h.priceAt.toISOString() : null,
      note: h.note
    })) as ClientPortfolioSnapshot['holdings'],
    totalValue: snapshot.totalValue,
    displayCurrency: snapshot.displayCurrency,
    priceLastUpdated: snapshot.priceLastUpdated ? snapshot.priceLastUpdated.toISOString() : null,
    fxLastUpdated: snapshot.fxLastUpdated ? snapshot.fxLastUpdated.toISOString() : null
  };

  return (
    <div>
      {/* New Dashboard with Charts */}
      <Dashboard initialSnapshot={initialSnapshot} />
      
      {/* Add Holding Form */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 24px' }}>
        <TickerDropdown />
      </div>
    </div>
  );
}
