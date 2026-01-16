'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type TrackedTicker = {
  symbol: string;
  price?: number | null;
  currency?: string | null;
  updatedAt?: string | null;
};

function formatNumber(value?: number | null, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function TrackedTickerDropdown({ tickers }: { tickers: TrackedTicker[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState('');

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="muted">Choose a ticker</span>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
        >
          <option value="">Select a ticker</option>
          {tickers.map((ticker) => (
            <option key={ticker.symbol} value={ticker.symbol}>
              {ticker.symbol} — {formatNumber(ticker.price)} {ticker.currency ?? ''}
            </option>
          ))}
        </select>
      </label>
      <button
        className="button"
        type="button"
        disabled={!selected}
        onClick={() => router.push(`/tickers/${selected}`)}
      >
        View details
      </button>
    </div>
  );
}
