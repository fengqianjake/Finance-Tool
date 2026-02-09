'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type TickerResult = {
  symbol: string;
  name: string;
  exchange?: string;
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

function isStockOrETF(assetClass: string): boolean {
  return assetClass === 'STOCK' || assetClass === 'ETF';
}

function isCash(assetClass: string): boolean {
  return assetClass.startsWith('CASH_');
}

function getUnitLabel(assetClass: string): string {
  if (isCash(assetClass)) return 'Amount';
  if (assetClass === 'GOLD' || assetClass === 'SILVER') return 'Amount (oz)';
  if (assetClass === 'BITCOIN') return 'Amount (BTC)';
  return 'Units / Shares';
}

export default function TickerDropdown() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TickerResult[]>([]);
  const [selected, setSelected] = useState<TickerResult | null>(null);
  const [assetClass, setAssetClass] = useState('STOCK');
  const [units, setUnits] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showSearch = useMemo(() => isStockOrETF(assetClass), [assetClass]);
  const unitLabel = useMemo(() => getUnitLabel(assetClass), [assetClass]);

  useEffect(() => {
    let mounted = true;
    const handle = setTimeout(async () => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        if (mounted) {
          setResults([]);
          setLoadingResults(false);
        }
        return;
      }

      setLoadingResults(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: trimmed });
        const res = await fetch(`/api/symbols?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Failed to search tickers');
        }
        const data = await res.json();
        if (mounted) {
          const nextResults = Array.isArray(data)
            ? data.map((item: any) => ({
                symbol: item.symbol,
                name: item.name || item.symbol,
                exchange: item.exchange
              }))
            : [];
          setResults(nextResults);
        }
      } catch (err: any) {
        console.error(err);
        if (mounted) setError('Unable to load tickers');
      } finally {
        if (mounted) setLoadingResults(false);
      }
    }, debounceDelay);

    return () => {
      mounted = false;
      clearTimeout(handle);
    };
  }, [query]);

  // Clear search when asset class changes to non-stock
  useEffect(() => {
    if (!showSearch) {
      setQuery('');
      setResults([]);
      setSelected(null);
    }
  }, [showSearch]);

  const canSubmit = useMemo(() => {
    if (!units || Number(units) <= 0) return false;
    if (isStockOrETF(assetClass)) return Boolean(selected?.symbol);
    return true;
  }, [assetClass, selected, units]);

  function handleSelect(item: TickerResult) {
    setSelected(item);
    setQuery(`${item.name} (${item.symbol})`);
    setResults([]); // Hide dropdown after selection
  }

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
      // Reset form
      setUnits('');
      setSelected(null);
      setQuery('');
      setResults([]);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Unable to add holding');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2 style={{ margin: '4px 0', fontSize: 20, fontWeight: 600 }}>Add a holding</h2>
      <p className="muted" style={{ margin: '0 0 16px 0', fontSize: 14 }}>
        Search by company name or symbol, pick an asset type, and add to your portfolio.
      </p>

      <div style={{ display: 'grid', gap: 16 }}>
        {/* Asset Type Selection */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Asset type</span>
          <select
            value={assetClass}
            onChange={(e) => setAssetClass(e.target.value)}
            style={{ 
              padding: '12px', 
              borderRadius: 8, 
              border: '1px solid var(--border)', 
              background: 'var(--panel)', 
              color: 'var(--text)',
              fontSize: 15,
              cursor: 'pointer'
            }}
          >
            {assetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Stock Search - only for STOCK/ETF */}
        {showSearch && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Search companies or symbols</span>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selected) setSelected(null);
                }}
                placeholder="e.g. Apple, AAPL, VOO..."
                style={{ 
                  padding: '12px', 
                  borderRadius: 8, 
                  border: '1px solid var(--border)', 
                  background: 'var(--panel)', 
                  color: 'var(--text)',
                  fontSize: 15
                }}
              />
            </label>

            {/* Search Results */}
            {results.length > 0 && (
              <div className="search-results">
                {results.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => handleSelect(item)}
                    style={{ 
                      display: 'block',
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      background: 'var(--bg)',
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.background = 'var(--panel)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = 'var(--bg)';
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {item.symbol}{item.exchange ? ` · ${item.exchange}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {loadingResults && <span className="muted" style={{ fontSize: 14 }}>Searching…</span>}
            {results.length === 0 && !loadingResults && query.length >= 2 && (
              <span className="muted" style={{ fontSize: 14 }}>No matches found.</span>
            )}

            {selected && (
              <div style={{ 
                padding: '10px 14px', 
                background: 'var(--panel)', 
                borderRadius: 8,
                fontSize: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span><strong>{selected.name}</strong> ({selected.symbol})</span>
                <button 
                  onClick={() => { setSelected(null); setQuery(''); }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontSize: 18,
                    color: 'var(--muted)'
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </>
        )}

        {/* Units/Amount Input */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>{unitLabel}</span>
          <input
            type="number"
            min="0"
            step="any"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            placeholder="0"
            style={{ 
              padding: '12px', 
              borderRadius: 8, 
              border: '1px solid var(--border)', 
              background: 'var(--panel)', 
              color: 'var(--text)',
              fontSize: 15
            }}
          />
        </label>

        {error && (
          <div style={{ 
            padding: '12px', 
            background: 'rgba(220, 38, 38, 0.08)', 
            color: 'var(--danger)',
            borderRadius: 8,
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        <button 
          className="button" 
          type="button" 
          onClick={handleAddHolding} 
          disabled={!canSubmit || loading}
          style={{ marginTop: 4 }}
        >
          {loading ? 'Adding...' : 'Add holding'}
        </button>
      </div>
    </section>
  );
}
