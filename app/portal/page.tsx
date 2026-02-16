import Link from 'next/link';
import { getPortfolioSnapshot } from '../lib/portfolio';
import { ensureSeedTickers, getLatestSnapshots, getTrackedTickers } from '../lib/pricing';
import Dashboard, { ClientPortfolioSnapshot } from '../../src/components/Dashboard';
import TickerDropdown from '../../src/components/TickerDropdown';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PortalPage() {
  try {
    console.log('PortalPage: Starting...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    const snapshot = await getPortfolioSnapshot();
    console.log('Portfolio snapshot retrieved:', snapshot.totalValue);
    
    await ensureSeedTickers();
    const tickers = await getTrackedTickers();
    const snapshots = await getLatestSnapshots(tickers);
    const lastUpdated = snapshots.length > 0 ? snapshots.reduce((latest, snap) => Math.max(latest, snap.createdAt.getTime()), 0) : null;
    
    const initialSnapshot: ClientPortfolioSnapshot = {
      holdings: snapshot.holdings.map((h) => ({
        id: h.id,
        assetClass: h.assetClass,
        symbol: h.symbol,
        name: h.name || null,
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
  } catch (error: any) {
    console.error('PortalPage error:', error);
    console.error('Error stack:', error.stack);
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Error loading portfolio</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>{error.message || 'Unknown error'}</p>
        <div style={{ 
          marginTop: '20px', 
          padding: '20px', 
          background: '#f5f5f5', 
          borderRadius: '8px', 
          textAlign: 'left',
          maxWidth: '800px',
          margin: '20px auto',
          overflow: 'auto'
        }}>
          <pre style={{ fontSize: '12px', color: '#d32f2f' }}>{error.stack || String(error)}</pre>
        </div>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#999' }}>
          DATABASE_URL: {process.env.DATABASE_URL ? 'Set ✓' : 'Missing ✗'}
        </p>
      </div>
    );
  }
}
