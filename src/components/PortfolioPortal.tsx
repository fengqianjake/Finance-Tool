'use client';

import { useEffect, useMemo, useState } from 'react';
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

type AssetOption = { value: string; label: string };

const assetOptions: AssetOption[] = [
  { value: 'STOCK', label: 'Stock' },
  { value: 'ETF', label: 'ETF' },
  { value: 'CASH_USD', label: 'Cash (USD)' },
  { value: 'CASH_EUR', label: 'Cash (EUR)' },
  { value: 'CASH_CNY', label: 'Cash (CNY)' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'BITCOIN', label: 'Bitcoin' }
];

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
  return new Date(value).toLocaleString();
}

function symbolEnabled(assetClass: string) {
  return assetClass === 'STOCK' || assetClass === 'ETF' || assetClass === 'BITCOIN';
}

export default function PortfolioPortal({ initialSnapshot }: { initialSnapshot: ClientPortfolioSnapshot }) {
  const [snapshot, setSnapshot] = useState<ClientPortfolioSnapshot>(initialSnapshot);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [assetClass, setAssetClass] = useState<string>('STOCK');
  const [symbol, setSymbol] = useState<string>('');
  const [units, setUnits] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabledSymbol = useMemo(() => symbolEnabled(assetClass), [assetClass]);

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ assetClass, symbol: enabledSymbol ? symbol : null, units: Number(units) })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save');
      }
      await refreshSnapshot();
      setUnits('');
      if (!enabledSymbol) setSymbol('');
    } catch (err: any) {
      setError(err.message || 'Error saving holding');
    } finally {
      setSubmitting(false);
    }
  }

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

  const totalLabel = formatNumber(snapshot.totalValue, snapshot.displayCurrency);

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '4px 0' }}>Portfolio portal</h2>
          <p className="muted" style={{ margin: 0 }}>
            Track holdings with daily updates for prices and currency conversions. Prices are stored automatically.
          </p>
        </div>
        <Link className="button secondary" href="/">Back to prices</Link>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <div>
          <p className="muted" style={{ margin: '0 0 4px' }}>Display currency</p>
          <select
            value={snapshot.displayCurrency}
            onChange={(e) => handleDisplayCurrencyChange(e.target.value)}
            disabled={submitting}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
          >
            {displayCurrencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="badge">Total value: {totalLabel}</div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 16 }} className="grid grid-2">
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="muted">Asset type</span>
          <select
            value={assetClass}
            onChange={(e) => {
              setAssetClass(e.target.value);
              if (!symbolEnabled(e.target.value)) setSymbol('');
            }}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
          >
            {assetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="muted">Symbol (optional for cash/metals)</span>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            disabled={!enabledSymbol || submitting}
            placeholder={enabledSymbol ? 'AAPL, VTI, BTC-USD...' : 'Auto-mapped for cash/metals'}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="muted">Units / shares</span>
          <input
            type="number"
            step="any"
            min="0"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            required
            disabled={submitting}
            placeholder="Enter quantity"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
          />
        </label>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Add holding'}
          </button>
          <button className="button secondary" type="button" onClick={refreshSnapshot} disabled={submitting}>
            Refresh values
          </button>
        </div>
      </form>

      {error && (
        <div className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#fecdd3', borderColor: 'rgba(239,68,68,0.5)', marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
        {snapshot.holdings.length === 0 && (
          <div className="muted">No holdings yet. Add stocks, ETFs, metals, crypto, or cash balances to see totals.</div>
        )}
        {snapshot.holdings.map((holding) => {
          const summaryValue =
            holding.valueInDisplay !== null ? formatNumber(holding.valueInDisplay, snapshot.displayCurrency) : '—';
          return (
            <details key={holding.id} className="card" style={{ padding: 16 }}>
              <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong>{holding.resolvedSymbol || holding.symbol || holding.assetClass.replace('_', ' ')}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {holding.assetClass.replace('_', ' ')} · {formatNumber(holding.units)} units
                  </span>
                </div>
                <div className="badge">Value: {summaryValue}</div>
              </summary>
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                {holding.resolvedSymbol && (
                  <div className="muted">Symbol: {holding.resolvedSymbol}</div>
                )}
                {holding.pricePerUnit !== null ? (
                  <div>
                    <div>Price per unit: {formatNumber(holding.pricePerUnit, holding.valueCurrency ?? undefined)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>Last price update: {formatDate(holding.priceAt)}</div>
                  </div>
                ) : (
                  <div className="muted">{holding.note || 'No price needed'}</div>
                )}
                <button className="button secondary" onClick={() => handleDelete(holding.id)} disabled={submitting}>
                  Remove
                </button>
              </div>
            </details>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
        <span className="muted">Prices last updated: {formatDate(snapshot.priceLastUpdated)}</span>
        <span className="muted">FX last updated: {formatDate(snapshot.fxLastUpdated)}</span>
        {refreshingPrices && <span className="muted">Updating prices…</span>}
      </div>
    </section>
  );
}
