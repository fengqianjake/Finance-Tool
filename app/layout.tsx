import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Portfolio Snapshot',
  description: 'Live ticker tracking powered by Yahoo Finance with daily refreshes.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div className="badge">Live • Daily price refresh</div>
              <h1 style={{ margin: '8px 0 4px', fontSize: 28 }}>Portfolio Snapshot</h1>
              <p className="muted" style={{ margin: 0 }}>Server-side Yahoo Finance pricing with history stored for your portfolios.</p>
            </div>
          </div>
        </header>
        <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
          {children}
        </main>
        <footer>Prices refresh automatically each day.</footer>
      </body>
    </html>
  );
}
