'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type TickerResult = {
  symbol: string;
  name: string;
};

const assetOptions = [
  { value: 'STOCK', label: 'Stock' },
  { value: 'ETF', label: 'ETF' },
  { value: 'CASH_USD', label: 'Cash (USD)' },
  { value: 'CASH_EUR', label: 'Cash (EUR)' },
  { value: 'CASH_CNY', label: 'Cash (CNY)' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'BITCOIN', label: 'Bitcoin' }
];

const debounceDelay = 200;

export default function TickerDropdown() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TickerResult[]>([]);
  const [selected, setSelected] = useState<TickerResult | null>(null);
  const [assetClass, setAssetClass] = useState('STOCK');
  const [units, setUnits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const trimmed = query.trim();
        const params = new URLSearchParams();
        const endpoint = trimmed ? '/api/symbols/search' : '/api/tickers';
        if (trimmed) params.set('q', trimmed);
        const res = await fetch(`${endpoint}?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to search tickers');
        }
        const data = await res.json();
        if (mounted) {
          const nextResults = Array.isArray(data.results)
            ? data.results.map((item: any) => ({
                symbol: item.symbol,
                name: item.name || item.longname || item.shortname || item.symbol
              }))
            : [];
          setResults(nextResults);
        }
      } catch (err: any) {
        console.error(err);
        if (mounted) setError(err.message || 'Unable to load tickers');
      } finally {
        if (mounted) setLoading(false);
      }
    }, debounceDelay);

    return () => {
      mounted = false;
      clearTimeout(handle);
    };
  }, [query]);

  const canSubmit = useMemo(() => {
    if (!units || Number(units) <= 0) return false;
    if (assetClass === 'STOCK' || assetClass === 'ETF') return Boolean(selected?.symbol);
    return true;
  }, [assetClass, selected, units]);

  async function handleAddHolding() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          assetClass,
          units: Number(units),
          symbol: selected?.symbol || null
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to add holding');
      }
      setUnits('');
      setSelected(null);
      setQuery('');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Unable to add holding');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2 style={{ margin: '4px 0' }}>Add a holding</h2>
      <p className="muted" style={{ margin: 0 }}>
        Search by company name or symbol, pick an asset type, and add units to your portfolio.
      </p>

      <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="muted">Search companies or symbols</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing a company or symbol"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
          />
        </label>

        <div>
          <p className="muted" style={{ margin: '0 0 6px' }}>Matches</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {results.length === 0 && !loading && <span className="muted">No matches yet.</span>}
            {results.map((item) => (
              <button
                key={item.symbol}
                type="button"
                className="list-button"
                onClick={() => setSelected(item)}
                style={{ textAlign: 'left' }}
              >
                <strong>{item.name}</strong>
                <span className="muted" style={{ display: 'block', fontSize: 13 }}>{item.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="badge">Selected: {selected.name} ({selected.symbol})</div>
        )}

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="muted">Asset type</span>
          <select
            value={assetClass}
            onChange={(e) => setAssetClass(e.target.value)}
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
          <span className="muted">Units</span>
          <input
            type="number"
            min="0"
            step="any"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            placeholder="0"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
          />
        </label>

        {error && <div className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#fecdd3', borderColor: 'rgba(239,68,68,0.5)' }}>{error}</div>}

        <button className="button" type="button" onClick={handleAddHolding} disabled={!canSubmit || loading}>
          {loading ? 'Adding...' : 'Add holding'}
        </button>
      </div>
    </section>
  );
}
