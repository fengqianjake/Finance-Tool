# Unified Investment Visualization Platform

A lightweight portfolio snapshot you can run locally to combine manual holdings, fetch live market prices from Yahoo Finance's public quote endpoint, and view aggregate value plus allocation weights across asset classes. Your holdings stay in your browser (via local storage) so you can reopen the page and pick up where you left off.

## What the local page does
- Add holdings by ticker, asset class, and share count.
- Pull live USD prices from the Yahoo Finance quote endpoint (stocks, ETFs, many FX/crypto/commodities) without needing to supply an API key.
- Compute market value and allocation weight per holding automatically as you edit share counts or refresh quotes.
- Start from a sample set that includes USD/CNY cash, gold, silver, and major crypto and reset back to it anytime.
- Persist your holdings to your browser so they reload automatically on revisit (data never leaves your machine).

## Why Yahoo Finance quotes
Yahoo Finance provides a broad set of delayed/near-real-time quotes through a public endpoint that works directly from the browser without authentication. This keeps the page completely client-side while covering most equities, ETFs, FX pairs, and popular crypto tickers.

## Run locally: manual portfolio capture
Run a lightweight static server to view the current site with your own data saved in the browser. When the server is running, open the portfolio instantly via [http://localhost:8000](http://localhost:8000).

1. From this repository root, start any static server (e.g., `python -m http.server 8000` or `npx serve .`).
2. Visit `http://localhost:8000` in your browser to load the portfolio page with your latest changes.
3. Add a holding by entering the ticker (e.g., `AAPL`), selecting an asset class, and typing the number of shares/units. The page fetches the latest available USD price via Yahoo Finance and updates value/weight.
4. Prices refresh automatically every hour. Click **Refresh prices** anytime to reload quotes immediately.
5. Use **Reset to sample** to restore the starter portfolio (this also overwrites local holdings with the sample set).

### Live pricing tips
- Yahoo Finance quotes are delayed/near real-time depending on the venue. If a lookup fails or a symbol is unsupported, the page shows an inline warning on the price cell and summarises the number of issues beneath the **Live pricing** heading.

## Files
- `index.html`: Structure of the portfolio page, including the live pricing controls.
- `style.css`: Gradient-driven styling, responsive form/table layout, and helper text.
- `app.js`: Client-side logic for holdings state, live price retrieval via Yahoo Finance, and aggregate calculations.
