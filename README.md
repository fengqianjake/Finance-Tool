# Unified Investment Visualization Platform

A lightweight portfolio snapshot you can run locally to combine manual holdings, fetch live market prices from Alpha Vantage, and view aggregate value plus allocation weights across asset classes. Your holdings and API key stay in your browser (via local storage) so you can reopen the page and pick up where you left off.

## What the local page does
- Add holdings by ticker, asset class, and share count.
- Pull live USD prices from Alpha Vantage (stocks, ETFs, some FX/crypto/commodities) with the free `demo` API key or your own key.
- Compute market value and allocation weight per holding automatically as you edit share counts or refresh quotes.
- Start from a sample set that includes USD/CNY cash, gold, silver, and major crypto and reset back to it anytime.
- Persist your holdings and API key to your browser so they reload automatically on revisit (data never leaves your machine).

## Why Alpha Vantage
Alpha Vantage offers free real-time or delayed quotes for many global equities and FX pairs, including common metal/crypto symbols. The `demo` key lets you try the page immediately; adding your own key increases call limits. Quotes are fetched client-side—no backend needed.

## Run locally: manual portfolio capture
Run a lightweight static server to view the current site with your own data saved in the browser:

1. From this repository root, start any static server (e.g., `python -m http.server 8000` or `npx serve .`).
2. Visit `http://localhost:8000` in your browser to load the portfolio page with your latest changes.
3. Paste your Alpha Vantage API key into the **Alpha Vantage API key** field (leave it blank to use `demo`). The key is saved locally.
4. Add a holding by entering the ticker (e.g., `AAPL`), selecting an asset class, and typing the number of shares/units. The page will fetch the live USD price via the Alpha Vantage `GLOBAL_QUOTE` endpoint and update value/weight.
5. Click **Refresh prices** to reload quotes for all holdings at any time.
6. Use **Reset to sample** to restore the starter portfolio (this also overwrites local holdings with the sample set).

### Live pricing tips
- The built-in `demo` key is highly rate-limited and only returns quotes for a handful of symbols; provide your own free key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key) for reliable results.
- If a lookup is blocked (rate limit, unsupported symbol, or bad key), the page shows an inline warning on the price cell and summarises the number of issues beneath the **Live pricing** heading.

## Files
- `index.html`: Structure of the portfolio page, including the live pricing controls.
- `style.css`: Gradient-driven styling, responsive form/table layout, and helper text.
- `app.js`: Client-side logic for holdings state, live price retrieval via Alpha Vantage, and aggregate calculations.
