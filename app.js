const holdingsBody = document.getElementById('holdings-body');
const aggregateEl = document.getElementById('aggregate');
const holdingCountEl = document.getElementById('holding-count');
const form = document.getElementById('holding-form');
const tickerInput = document.getElementById('ticker');
const assetClassInput = document.getElementById('asset-class');
const sharesInput = document.getElementById('shares');
const priceInput = document.getElementById('price');
const resetButton = document.getElementById('reset');

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

let holdings = [
  { id: crypto.randomUUID(), ticker: 'AAPL', assetClass: 'Equity', shares: 50, price: 190 },
  { id: crypto.randomUUID(), ticker: 'MSFT', assetClass: 'Equity', shares: 30, price: 320 },
  { id: crypto.randomUUID(), ticker: 'VWRA.L', assetClass: 'Equity', shares: 60, price: 90 },
  { id: crypto.randomUUID(), ticker: 'USD', assetClass: 'Cash - USD', shares: 2500, price: 1 },
  { id: crypto.randomUUID(), ticker: 'CNY', assetClass: 'Cash - CNY', shares: 5000, price: 0.14 },
  { id: crypto.randomUUID(), ticker: 'XAU', assetClass: 'Gold', shares: 2, price: 1950 },
  { id: crypto.randomUUID(), ticker: 'XAG', assetClass: 'Silver', shares: 100, price: 23 },
  { id: crypto.randomUUID(), ticker: 'BTC', assetClass: 'Bitcoin (BTC)', shares: 0.5, price: 27000 },
  { id: crypto.randomUUID(), ticker: 'ETH', assetClass: 'Ethereum (ETH)', shares: 1.2, price: 1700 },
];

function render() {
  const total = holdings.reduce((sum, h) => sum + h.shares * h.price, 0);
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
    const value = holding.shares * holding.price;
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
    const priceField = document.createElement('input');
    priceField.type = 'number';
    priceField.className = 'value-input';
    priceField.min = '0';
    priceField.step = '0.01';
    priceField.value = holding.price;
    priceField.addEventListener('input', (event) => {
      const parsed = parseFloat(event.target.value);
      holding.price = Number.isFinite(parsed) ? parsed : 0;
      render();
    });
    priceCell.appendChild(priceField);
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

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const ticker = tickerInput.value.trim().toUpperCase();
  const assetClass = assetClassInput.value;
  const shares = parseFloat(sharesInput.value);
  const price = parseFloat(priceInput.value);

  if (!ticker || !assetClass || !Number.isFinite(shares) || !Number.isFinite(price) || shares < 0 || price < 0) {
    return;
  }

  holdings = [
    { id: crypto.randomUUID(), ticker, assetClass, shares, price },
    ...holdings,
  ];

  form.reset();
  tickerInput.focus();
  render();
});

resetButton.addEventListener('click', () => {
  holdings = [
    { id: crypto.randomUUID(), ticker: 'AAPL', assetClass: 'Equity', shares: 50, price: 190 },
    { id: crypto.randomUUID(), ticker: 'MSFT', assetClass: 'Equity', shares: 30, price: 320 },
    { id: crypto.randomUUID(), ticker: 'VWRA.L', assetClass: 'Equity', shares: 60, price: 90 },
    { id: crypto.randomUUID(), ticker: 'USD', assetClass: 'Cash - USD', shares: 2500, price: 1 },
    { id: crypto.randomUUID(), ticker: 'CNY', assetClass: 'Cash - CNY', shares: 5000, price: 0.14 },
    { id: crypto.randomUUID(), ticker: 'XAU', assetClass: 'Gold', shares: 2, price: 1950 },
    { id: crypto.randomUUID(), ticker: 'XAG', assetClass: 'Silver', shares: 100, price: 23 },
    { id: crypto.randomUUID(), ticker: 'BTC', assetClass: 'Bitcoin (BTC)', shares: 0.5, price: 27000 },
    { id: crypto.randomUUID(), ticker: 'ETH', assetClass: 'Ethereum (ETH)', shares: 1.2, price: 1700 },
  ];
  render();
});

render();
