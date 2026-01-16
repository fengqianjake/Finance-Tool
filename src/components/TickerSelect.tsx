'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type SymbolResult = {
  symbol: string;
  exchange?: string;
  currency?: string;
  name?: string;
};

const debounceDelay = 300;

export default function TickerSelect() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [manualSymbol, setManualSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/symbols?q=${encodeURIComponent(trimmed)}`, { cache: 'no-store' });
        if (!res.ok) {
          setError('Search failed');
          setResults([]);
          return;
        }
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError('Unable to search right now');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceDelay);

    return () => clearTimeout(handle);
  }, [query]);

  const hasNoResults = !loading && query.trim().length > 0 && results.length === 0 && !error;

  async function saveSymbol(symbol: string, redirect = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Failed to save ticker');
        return;
      }
      if (redirect) {
        router.push(`/tickers/${symbol.toUpperCase()}`);
        return;
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Could not save ticker');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(symbol: string) {
    await saveSymbol(symbol, true);
  }

  async function handleAddManual() {
    if (!manualSymbol.trim()) return;
    await saveSymbol(manualSymbol.trim().toUpperCase());
    setManualSymbol('');
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h2 style={{ margin: '4px 0' }}>Add a ticker</h2>
          <p className="muted" style={{ margin: 0 }}>Search across global equities, ETFs, and bonds. Saved tickers refresh automatically each day.</p>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="muted">Manual symbol entry</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter symbol manually (e.g., AAPL, 0700.HK)"
              value={manualSymbol}
              onChange={(e) => setManualSymbol(e.target.value)}
              style={{ flex: '1 1 240px', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 16 }}
            />
            <button className="button secondary" type="button" onClick={handleAddManual} disabled={loading}>
              Add symbol
            </button>
          </div>
        </label>
      </div>
      <div style={{ marginTop: 12 }}>
        <input
          type="text"
          placeholder="Search by symbol or name (e.g., AAPL, 0700.HK, VOO)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 16 }}
        />
      </div>
      {loading && <p className="muted" style={{ marginTop: 8 }}>Loading…</p>}
      {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
      {hasNoResults && <p className="muted" style={{ marginTop: 8 }}>No results found.</p>}
      {results.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map((result) => {
            const label = result.name || '';
            return (
              <li key={result.symbol}>
                <button
                  type="button"
                  onClick={() => handleSelect(result.symbol)}
                  className="list-button"
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <strong>{result.symbol}</strong>
                    <span className="muted" style={{ fontSize: 14 }}>
                      {label ? `${label} — ` : ''}
                      {result.exchange || 'Exchange'}
                      {result.currency ? ` · ${result.currency}` : ''}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
