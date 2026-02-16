import prisma from '../lib/prisma';
import { getPortfolioSnapshot } from '../lib/portfolio';
import Dashboard, { ClientPortfolioSnapshot } from '../../src/components/Dashboard';
import TickerDropdown from '../../src/components/TickerDropdown';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PortalPage() {
  try {
    // Test database connection first
    await prisma.$connect();
    await prisma.$disconnect();
    
    const snapshot = await getPortfolioSnapshot();
    
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
      })),
      totalValue: snapshot.totalValue,
      displayCurrency: snapshot.displayCurrency,
      priceLastUpdated: snapshot.priceLastUpdated ? snapshot.priceLastUpdated.toISOString() : null,
      fxLastUpdated: snapshot.fxLastUpdated ? snapshot.fxLastUpdated.toISOString() : null
    };

    return (
      <div>
        <Dashboard initialSnapshot={initialSnapshot} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 24px' }}>
          <TickerDropdown />
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
        <h1>Error: {error.message}</h1>
        <pre style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', overflow: 'auto' }}>
          {error.stack}
        </pre>
      </div>
    );
  }
}
