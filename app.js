const holdingsBody = document.getElementById('holdings-body');
const aggregateEl = document.getElementById('aggregate');
const holdingCountEl = document.getElementById('holding-count');
const form = document.getElementById('holding-form');
const tickerInput = document.getElementById('ticker');
const valueInput = document.getElementById('value');
const resetButton = document.getElementById('reset');

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

let holdings = [
  { id: crypto.randomUUID(), ticker: 'AAPL', value: 12500 },
  { id: crypto.randomUUID(), ticker: 'MSFT', value: 9800 },
  { id: crypto.randomUUID(), ticker: 'VWRA.L', value: 5400 },
];

function render() {
  const total = holdings.reduce((sum, h) => sum + h.value, 0);
  aggregateEl.textContent = total ? currencyFormatter.format(total) : '—';
  holdingCountEl.textContent = holdings.length;

  holdingsBody.innerHTML = '';

  if (!holdings.length) {
    const row = document.createElement('tr');
    row.className = 'empty';
    row.innerHTML = '<td colspan="4">No holdings yet — add your first ticker to see allocations.</td>';
    holdingsBody.appendChild(row);
    return;
  }

  holdings.forEach((holding) => {
    const weight = total ? (holding.value / total) * 100 : 0;
    const row = document.createElement('tr');

    const tickerCell = document.createElement('td');
    tickerCell.textContent = holding.ticker;
    row.appendChild(tickerCell);

    const valueCell = document.createElement('td');
    valueCell.className = 'numeric';
    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = 'value-input';
    valueInput.min = '0';
    valueInput.step = '0.01';
    valueInput.value = holding.value;
    valueInput.addEventListener('input', (event) => {
      const parsed = parseFloat(event.target.value);
      holding.value = Number.isFinite(parsed) ? parsed : 0;
      render();
    });
    valueCell.appendChild(valueInput);
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
  const value = parseFloat(valueInput.value);

  if (!ticker || !Number.isFinite(value) || value < 0) {
    return;
  }

  holdings = [
    { id: crypto.randomUUID(), ticker, value },
    ...holdings,
  ];

  form.reset();
  tickerInput.focus();
  render();
});

resetButton.addEventListener('click', () => {
  holdings = [
    { id: crypto.randomUUID(), ticker: 'AAPL', value: 12500 },
    { id: crypto.randomUUID(), ticker: 'MSFT', value: 9800 },
    { id: crypto.randomUUID(), ticker: 'VWRA.L', value: 5400 },
  ];
  render();
});

render();
