import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Portfolio Snapshot',
  description: 'Live ticker tracking powered by Yahoo Finance with automatic 3-hour refreshes.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div className="badge">Live • Auto-refresh every 3 hours</div>
              <h1 style={{ margin: '8px 0 4px', fontSize: 28 }}>Portfolio Snapshot</h1>
              <p className="muted" style={{ margin: 0 }}>Server-side Yahoo Finance pricing with history stored in Postgres.</p>
            </div>
            <a className="button secondary" href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </header>
        <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
          {children}
        </main>
        <footer>Last refreshed automatically via Vercel Cron every 3 hours.</footer>
      </body>
    </html>
  );
}
