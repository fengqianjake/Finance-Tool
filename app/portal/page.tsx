// Test if imports work
import prisma from '../lib/prisma';

export const dynamic = 'force-dynamic';

export default async function PortalPage() {
  try {
    // Simple test query
    const count = await prisma.ticker.count();
    return (
      <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
        <h1>Database Connected!</h1>
        <p>Number of tickers: {count}</p>
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
        <h1>Database Error</h1>
        <p>{error.message}</p>
        <pre style={{ background: '#f5f5f5', padding: '20px' }}>{error.stack}</pre>
      </div>
    );
  }
}
