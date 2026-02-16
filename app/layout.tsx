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
        <header style={{ 
          borderBottom: '1px solid #e0e0e0',
          background: '#fff'
        }}>
          <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto', 
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#000',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px'
              }}>
                P
              </div>
              <span style={{ fontSize: '20px', fontWeight: 700 }}>Portfolio</span>
            </div>
            <nav style={{ display: 'flex', gap: '24px' }}>
              <a href="/" style={{ 
                fontSize: '15px', 
                color: '#666',
                textDecoration: 'none'
              }}>Prices</a>
              <a href="/portal" style={{ 
                fontSize: '15px', 
                color: '#000',
                fontWeight: 600,
                textDecoration: 'none'
              }}>Dashboard</a>
            </nav>
          </div>
        </header>
        <main style={{ background: '#fafafa', minHeight: 'calc(100vh - 65px)' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
