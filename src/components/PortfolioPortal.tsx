'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export type ClientHoldingView = {
  id: string;
  assetClass: string;
  symbol: string | null;
  resolvedSymbol: string | null;
  units: number;
  valueCurrency: string | null;
  valueInDisplay: number | null;
  pricePerUnit: number | null;
  priceAt: string | null;
  note?: string;
};

export type ClientPortfolioSnapshot = {
  holdings: ClientHoldingView[];
  totalValue: number;
  displayCurrency: string;
  priceLastUpdated: string | null;
  fxLastUpdated: string | null;
};

const displayCurrencies = ['USD', 'EUR', 'CNY'];

function formatNumber(value: number | null | undefined, currency?: string) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: currency ? 'currency' : 'decimal',
    currency: currency || undefined
  });
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getAssetLabel(assetClass: string): string {
  return assetClass.replace('_', ' ');
}

export default function PortfolioPortal({ initialSnapshot }: { initialSnapshot: ClientPortfolioSnapshot }) {
  const [snapshot, setSnapshot] = useState<ClientPortfolioSnapshot>(initialSnapshot);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshSnapshot() {
    const res = await fetch('/api/holdings', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to refresh holdings');
    const data = (await res.json()) as ClientPortfolioSnapshot;
    setSnapshot(data);
  }

  async function refreshPricesIfStale() {
    if (refreshingPrices) return;
    if (!snapshot.priceLastUpdated) {
      if (snapshot.holdings.length === 0) return;
    }
    const lastUpdated = snapshot.priceLastUpdated ? new Date(snapshot.priceLastUpdated).getTime() : 0;
    if (Number.isNaN(lastUpdated)) return;
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (lastUpdated > dayAgo || refreshingPrices) return;

    setRefreshingPrices(true);
    try {
      const res = await fetch('/api/cron', { cache: 'no-store' });
      if (res.ok) {
        await refreshSnapshot();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshingPrices(false);
    }
  }

  useEffect(() => {
    refreshPricesIfStale();
  }, [snapshot.priceLastUpdated, snapshot.holdings.length]);

  async function handleDelete(id: string) {
    setSubmitting(true);
    setError(null);
    try {
      const params = new URLSearchParams({ id });
      const res = await fetch(`/api/holdings?${params.toString()}`, { method: 'DELETE', cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete');
      }
      await refreshSnapshot();
    } catch (err: any) {
      setError(err.message || 'Error deleting holding');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisplayCurrencyChange(nextCurrency: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ displayCurrency: nextCurrency })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to update display currency');
      }
      const data = (await res.json()) as ClientPortfolioSnapshot;
      setSnapshot(data);
    } catch (err: any) {
      setError(err.message || 'Error updating display currency');
    } finally {
      setSubmitting(false);
    }
  }

  const totalValue = snapshot.totalValue;
  const displayCurrency = snapshot.displayCurrency;

  return (
    <section className="card" style={{ padding: 24 }}>
      {/* Portfolio Value - Trade Republic Style */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="portfolio-label" style={{ marginBottom: 8 }}>Portfolio Value</div>
        <div className="portfolio-value">{formatNumber(totalValue, displayCurrency)}</div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {displayCurrencies.map((c) => (
            <button
              key={c}
              onClick={() => handleDisplayCurrencyChange(c)}
              disabled={submitting || c === displayCurrency}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: c === displayCurrency ? '#000' : 'var(--panel)',
                color: c === displayCurrency ? '#fff' : 'var(--text)',
                fontSize: 13,
                fontWeight: 600,
                cursor: c === displayCurrency ? 'default' : 'pointer',
                opacity: submitting ? 0.6 : 1
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Last Updated Info */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 24, 
        marginBottom: 24,
        fontSize: 13,
        color: 'var(--muted)'
      }}>
        <span>Prices: {formatDate(snapshot.priceLastUpdated)}</span>
        <span>FX: {formatDate(snapshot.fxLastUpdated)}</span>
      </div>

      {error && (
        <div style={{ 
          padding: '12px 16px', 
          background: 'rgba(220, 38, 38, 0.08)', 
          color: 'var(--danger)',
          borderRadius: 8,
          fontSize: 14,
          marginBottom: 16
        }}>
          {error}
        </div>
      )}

      {/* Holdings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {snapshot.holdings.length === 0 && (
          <div className="muted" style={{ textAlign: 'center', padding: '40px 20px' }}>
            No holdings yet. Add your first investment above.
          </div>
        )}
        
        {snapshot.holdings.map((holding) => {
          const value = holding.valueInDisplay !== null 
            ? formatNumber(holding.valueInDisplay, displayCurrency) 
            : '—';
          
          const name = holding.resolvedSymbol || holding.symbol || getAssetLabel(holding.assetClass);
          const subtitle = holding.symbol && holding.symbol !== holding.resolvedSymbol
            ? `${getAssetLabel(holding.assetClass)} · ${holding.symbol}`
            : getAssetLabel(holding.assetClass);
          
          return (
            <div key={holding.id} className="holding-item">
              <div className="holding-header">
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {subtitle} · {holding.units} {holding.assetClass === 'STOCK' || holding.assetClass === 'ETF' ? 'shares' : 'units'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="holding-value">{value}</div>
                  {holding.pricePerUnit !== null && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {formatNumber(holding.pricePerUnit, holding.valueCurrency || undefined)} each
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid var(--border)'
              }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  Updated {formatDate(holding.priceAt)}
                </span>
                <button 
                  onClick={() => handleDelete(holding.id)} 
                  disabled={submitting}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    fontSize: 13,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {refreshingPrices && (
        <div style={{ textAlign: 'center', marginTop: 16 }} className="muted">
          Updating prices…
        </div>
      )}
    </section>
  );
}
