'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type SymbolResult = {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
  currency?: string;
};

const debounceDelay = 300;

export default function TickerSelect() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/symbols/search?q=${encodeURIComponent(trimmed)}`, { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || 'Search failed');
          setResults([]);
          return;
        }
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
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

  async function handleSelect(symbol: string) {
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
      router.push(`/tickers/${symbol.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      setError('Could not save ticker');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h2 style={{ margin: '4px 0' }}>Add a ticker</h2>
          <p className="muted" style={{ margin: 0 }}>Search across global equities, ETFs, and bonds. Saved tickers are captured by the cron job automatically.</p>
        </div>
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
            const label = result.longname || result.shortname || '';
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
                      {result.exchange || 'Exchange unknown'}
                      {result.quoteType ? ` [${result.quoteType}]` : ''}
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
