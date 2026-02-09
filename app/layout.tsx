import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Portfolio',
  description: 'Track your investments'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Portfolio</h1>
            </div>
            <nav style={{ display: 'flex', gap: 20 }}>
              <a href="/" style={{ fontSize: 15, fontWeight: 500, color: 'var(--muted)' }}>Prices</a>
              <a href="/portal" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Portfolio</a>
            </nav>
          </div>
        </header>
        <main className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
