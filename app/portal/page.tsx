import Link from 'next/link';
import { getPortfolioSnapshot } from '../lib/portfolio';
import PortfolioPortal, { ClientPortfolioSnapshot } from '../../src/components/PortfolioPortal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PortalPage() {
  const snapshot = await getPortfolioSnapshot();
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
    </div>
  );
}
