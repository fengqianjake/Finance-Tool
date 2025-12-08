const holdingsBody = document.getElementById('holdings-body');
const aggregateEl = document.getElementById('aggregate');
const holdingCountEl = document.getElementById('holding-count');
const form = document.getElementById('holding-form');
const tickerInput = document.getElementById('ticker');
const assetClassInput = document.getElementById('asset-class');
const sharesInput = document.getElementById('shares');
const resetButton = document.getElementById('reset');
const apiKeyInput = document.getElementById('api-key');
const refreshPricesBtn = document.getElementById('refresh-prices');
const priceStatusEl = document.getElementById('price-status');

const API_BASE = 'https://www.alphavantage.co/query';
const DEMO_KEY = 'demo';
const STORAGE_KEYS = {
  holdings: 'portfolio_holdings_v1',
  apiKey: 'portfolio_api_key_v1',
};

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const currencyFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const priceFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function fallbackPrice(holding) {
  if (holding.assetClass === 'Cash - USD') return 1;
  if (holding.assetClass === 'Cash - CNY') return 0.14;
  return holding.price || 0;
}

function livePrice(holding) {
  return typeof holding.marketPrice === 'number' ? holding.marketPrice : fallbackPrice(holding);
}

function normaliseSymbol(ticker, assetClass) {
  const upper = ticker.toUpperCase();
  if (assetClass === 'Cash - USD' || assetClass === 'Cash - CNY') return null;
  if (assetClass === 'Gold') return 'XAUUSD';
  if (assetClass === 'Silver') return 'XAGUSD';
  if (assetClass.includes('Bitcoin')) return 'BTCUSD';
  if (assetClass.includes('Ethereum')) return 'ETHUSD';
  return upper;
}

async function fetchQuote(holding) {
  const symbol = normaliseSymbol(holding.ticker, holding.assetClass);
  if (!symbol) return null;
  const key = apiKeyInput.value.trim() || DEMO_KEY;
  const url = `${API_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Quote lookup failed (${response.status})`);
    const data = await response.json();
    const quote = data['Global Quote'];
    const price = quote ? parseFloat(quote['05. price']) : null;
    if (Number.isFinite(price)) {
      return { price, symbol };
    }
  } catch (error) {
    console.warn('Unable to fetch quote', symbol, error);
  }
  return null;
}

function updateStatus(message) {
  priceStatusEl.textContent = message;
}

function getTotalValue() {
  return holdings.reduce((sum, h) => sum + h.shares * livePrice(h), 0);
}

function loadHoldings() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.holdings);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((item) => ({
        id: item.id || generateId(),
        ticker: String(item.ticker || '').toUpperCase(),
        assetClass: item.assetClass || 'Equity',
        shares: Number.isFinite(parseFloat(item.shares)) ? parseFloat(item.shares) : 0,
        price: Number.isFinite(parseFloat(item.price)) ? parseFloat(item.price) : 0,
      }))
      .filter((item) => item.ticker && item.assetClass);
  } catch (error) {
    console.warn('Unable to load holdings from storage', error);
    return null;
  }
}

function persistHoldings() {
  if (typeof localStorage === 'undefined') return;
  try {
    const serializable = holdings.map(({ id, ticker, assetClass, shares, price }) => ({
      id,
      ticker,
      assetClass,
      shares,
      price,
    }));
    localStorage.setItem(STORAGE_KEYS.holdings, JSON.stringify(serializable));
  } catch (error) {
    console.warn('Unable to save holdings to storage', error);
  }
}

function loadApiKey() {
  if (typeof localStorage === 'undefined') return '';
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.apiKey);
    return saved || '';
  } catch {
    return '';
  }
}

function persistApiKey(value) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.apiKey, value);
  } catch (error) {
    console.warn('Unable to save API key to storage', error);
  }
}

const sampleHoldings = [
  { ticker: 'AAPL', assetClass: 'Equity', shares: 50, price: 190 },
  { ticker: 'MSFT', assetClass: 'Equity', shares: 30, price: 320 },
  { ticker: 'VWRA.L', assetClass: 'Equity', shares: 60, price: 90 },
  { ticker: 'USD', assetClass: 'Cash - USD', shares: 2500, price: 1 },
  { ticker: 'CNY', assetClass: 'Cash - CNY', shares: 5000, price: 0.14 },
  { ticker: 'XAU', assetClass: 'Gold', shares: 2, price: 1950 },
  { ticker: 'XAG', assetClass: 'Silver', shares: 100, price: 23 },
  { ticker: 'BTC', assetClass: 'Bitcoin (BTC)', shares: 0.5, price: 27000 },
  { ticker: 'ETH', assetClass: 'Ethereum (ETH)', shares: 1.2, price: 1700 },
];

function getSampleHoldings() {
  return sampleHoldings.map((h) => ({ ...h, id: generateId() }));
}

let holdings = loadHoldings() || getSampleHoldings();
apiKeyInput.value = loadApiKey() || DEMO_KEY;

function render() {
  persistHoldings();
  const total = getTotalValue();
  aggregateEl.textContent = total ? currencyFormatter.format(total) : '—';
  holdingCountEl.textContent = holdings.length;

  holdingsBody.innerHTML = '';

  if (!holdings.length) {
    const row = document.createElement('tr');
    row.className = 'empty';
    row.innerHTML = '<td colspan="7">No holdings yet — add your first ticker to see allocations.</td>';
    holdingsBody.appendChild(row);
    return;
  }

  holdings.forEach((holding) => {
    const price = livePrice(holding);
    const value = holding.shares * price;
    const weight = total ? (value / total) * 100 : 0;
    const row = document.createElement('tr');

    const tickerCell = document.createElement('td');
    tickerCell.textContent = holding.ticker;
    row.appendChild(tickerCell);

    const assetClassCell = document.createElement('td');
    assetClassCell.textContent = holding.assetClass;
    row.appendChild(assetClassCell);

    const sharesCell = document.createElement('td');
    sharesCell.className = 'numeric';
    const sharesField = document.createElement('input');
    sharesField.type = 'number';
    sharesField.className = 'value-input';
    sharesField.min = '0';
    sharesField.step = '0.0001';
    sharesField.value = holding.shares;
    sharesField.addEventListener('input', (event) => {
      const parsed = parseFloat(event.target.value);
      holding.shares = Number.isFinite(parsed) ? parsed : 0;
      render();
    });
    sharesCell.appendChild(sharesField);
    row.appendChild(sharesCell);

    const priceCell = document.createElement('td');
    priceCell.className = 'numeric';
    if (holding.loadingPrice) {
      priceCell.textContent = 'Loading…';
    } else if (Number.isFinite(price)) {
      priceCell.textContent = priceFormatter.format(price);
      if (holding.priceSymbol && holding.priceSymbol !== holding.ticker) {
        priceCell.title = `Fetched as ${holding.priceSymbol}`;
      }
    } else {
      priceCell.textContent = '—';
    }
    if (holding.priceError) {
      priceCell.title = priceCell.title ? `${priceCell.title} — ${holding.priceError}` : holding.priceError;
      priceCell.classList.add('warning');
    }
    row.appendChild(priceCell);

    const valueCell = document.createElement('td');
    valueCell.className = 'numeric';
    valueCell.textContent = currencyFormatter.format(value);
    row.appendChild(valueCell);

    const weightCell = document.createElement('td');
    weightCell.className = 'numeric weight';
    weightCell.textContent = `${weight.toFixed(1)}%`;
    row.appendChild(weightCell);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'row-actions';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      holdings = holdings.filter((h) => h.id !== holding.id);
      render();
    });
    actionsCell.appendChild(removeBtn);
    row.appendChild(actionsCell);

    holdingsBody.appendChild(row);
  });
}

async function hydrateHoldingPrice(holding) {
  const current = holdings.find((h) => h.id === holding.id);
  if (!current) return false;

  current.loadingPrice = true;
  render();
  const quote = await fetchQuote(current);
  const stillPresent = holdings.find((h) => h.id === holding.id);
  if (!stillPresent) {
    render();
    return false;
  }

  stillPresent.loadingPrice = false;
  let success = false;
  if (quote && Number.isFinite(quote.price)) {
    stillPresent.marketPrice = quote.price;
    stillPresent.price = quote.price;
    stillPresent.priceSymbol = quote.symbol;
    stillPresent.priceError = undefined;
    success = true;
  } else {
    stillPresent.priceError = 'Price unavailable (check API key, symbol, or rate limits).';
    stillPresent.marketPrice = fallbackPrice(stillPresent);
  }
  render();
  return success;
}

async function refreshAllPrices() {
  if (!holdings.length) return;
  updateStatus('Fetching live prices…');
  let failures = 0;
  await Promise.all(
    holdings.map(async (h) => {
      const success = await hydrateHoldingPrice(h);
      if (!success) failures += 1;
    }),
  );
  if (failures) {
    updateStatus(`Prices refreshed with ${failures} issue${failures === 1 ? '' : 's'} (check API key, symbol, or rate limits).`);
  } else {
    updateStatus('Prices refreshed.');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const ticker = tickerInput.value.trim().toUpperCase();
  const assetClass = assetClassInput.value;
  const shares = parseFloat(sharesInput.value);

  if (!ticker || !assetClass || !Number.isFinite(shares) || shares < 0) {
    return;
  }

  const newHolding = { id: generateId(), ticker, assetClass, shares, price: 0 };
  holdings = [newHolding, ...holdings];

  form.reset();
  tickerInput.focus();
  render();
  hydrateHoldingPrice(newHolding);
});

resetButton.addEventListener('click', () => {
  holdings = getSampleHoldings();
  render();
  refreshAllPrices();
});

refreshPricesBtn.addEventListener('click', () => {
  refreshAllPrices();
});

apiKeyInput.addEventListener('input', () => {
  persistApiKey(apiKeyInput.value.trim());
});

render();
refreshAllPrices();
