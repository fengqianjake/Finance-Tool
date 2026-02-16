'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

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
    month: 'short'
  });
}

function getAssetLabel(assetClass: string): string {
  return assetClass.replace('_', ' ');
}

// Generate mock historical data for demo (in production, fetch from API)
function generateHistoricalData(currentValue: number, currency: string) {
  const data = [];
  const now = new Date();
  let value = currentValue * 0.85; // Start 15% lower
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Random fluctuation between -3% and +3%
    const change = (Math.random() - 0.5) * 0.06;
    value = value * (1 + change);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
      displayValue: formatNumber(value, currency)
    });
  }
  
  return data;
}

export default function Dashboard({ initialSnapshot }: { initialSnapshot: ClientPortfolioSnapshot }) {
  const [snapshot, setSnapshot] = useState<ClientPortfolioSnapshot>(initialSnapshot);
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | '1Y'>('1M');
  const [submitting, setSubmitting] = useState(false);

  // Generate historical data based on current portfolio value
  const chartData = useMemo(() => {
    return generateHistoricalData(snapshot.totalValue, snapshot.displayCurrency);
  }, [snapshot.totalValue, snapshot.displayCurrency]);

  // Calculate performance metrics
  const performance = useMemo(() => {
    if (chartData.length < 2) return { change: 0, changePercent: 0 };
    const startValue = chartData[0].value;
    const endValue = chartData[chartData.length - 1].value;
    const change = endValue - startValue;
    const changePercent = (change / startValue) * 100;
    return { change, changePercent };
  }, [chartData]);

  const totalValue = snapshot.totalValue;
  const displayCurrency = snapshot.displayCurrency;
  const isPositive = performance.change >= 0;

  async function handleDisplayCurrencyChange(nextCurrency: string) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ displayCurrency: nextCurrency })
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      setSnapshot(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Header with Portfolio Value */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '24px'
        }}>
          <div>
            <div style={{ 
              fontSize: '14px', 
              color: '#666', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}>
              Total Portfolio Value
            </div>
            <div style={{ 
              fontSize: '56px', 
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}>
              {formatNumber(totalValue, displayCurrency)}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginTop: '12px'
            }}>
              <span style={{ 
                fontSize: '18px',
                fontWeight: 600,
                color: isPositive ? '#16a34a' : '#dc2626'
              }}>
                {isPositive ? '+' : ''}{formatNumber(performance.change, displayCurrency)}
              </span>
              <span style={{ 
                fontSize: '14px',
                color: isPositive ? '#16a34a' : '#dc2626',
                background: isPositive ? '#dcfce7' : '#fee2e2',
                padding: '4px 8px',
                borderRadius: '6px'
              }}>
                {isPositive ? '+' : ''}{performance.changePercent.toFixed(2)}%
              </span>
              <span style={{ fontSize: '14px', color: '#666' }}>
                Past 30 days
              </span>
            </div>
          </div>
          
          {/* Currency Selector */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {displayCurrencies.map((c) => (
              <button
                key={c}
                onClick={() => handleDisplayCurrencyChange(c)}
                disabled={submitting || c === displayCurrency}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  background: c === displayCurrency ? '#000' : '#fff',
                  color: c === displayCurrency ? '#fff' : '#000',
                  fontSize: '14px',
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

        {/* Time Range Selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['1W', '1M', '3M', '1Y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: timeRange === range ? '#f5f5f5' : 'transparent',
                color: timeRange === range ? '#000' : '#666',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ 
        background: '#fff', 
        border: '1px solid #e0e0e0',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#000" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: '#666' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#666' }}
              tickFormatter={(value) => formatNumber(value, displayCurrency)}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip 
              formatter={(value: number | undefined) => [value !== undefined ? formatNumber(value, displayCurrency) : '—', 'Value']}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
              contentStyle={{
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#000" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Holdings Grid */}
      <div>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: 600, 
          marginBottom: '16px' 
        }}>
          Holdings
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px' 
        }}>
          {snapshot.holdings.map((holding) => {
            const value = holding.valueInDisplay ?? 0;
            const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
            const name = holding.resolvedSymbol || holding.symbol || getAssetLabel(holding.assetClass);
            
            return (
              <div 
                key={holding.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '20px',
                  transition: 'box-shadow 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>
                      {name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                      {holding.units} {holding.assetClass === 'STOCK' || holding.assetClass === 'ETF' ? 'shares' : 'units'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>
                      {formatNumber(value, displayCurrency)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div style={{ 
                  height: '4px', 
                  background: '#f0f0f0', 
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${percentage}%`, 
                    height: '100%', 
                    background: '#000',
                    borderRadius: '2px'
                  }} />
                </div>
                
                {holding.pricePerUnit && (
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#666', 
                    marginTop: '12px' 
                  }}>
                    {formatNumber(holding.pricePerUnit, holding.valueCurrency || undefined)} per unit
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
