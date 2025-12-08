# Unified Investment Visualization Platform

A lightweight, publicly hostable portfolio snapshot that lets individuals combine manual holdings, fetch live market prices from Alpha Vantage, and view aggregate value plus allocation weights across asset classes.

## What the static site does
- Add holdings by ticker, asset class, and share count.
- Pull live USD prices from Alpha Vantage (stocks, ETFs, some FX/crypto/commodities) with the free `demo` API key or your own key.
- Compute market value and allocation weight per holding automatically as you edit share counts or refresh quotes.
- Start from a sample set that includes USD/CNY cash, gold, silver, and major crypto and reset back to it anytime.

## Why Alpha Vantage
Alpha Vantage offers free real-time or delayed quotes for many global equities and FX pairs, including common metal/crypto symbols. The `demo` key lets you try the page immediately; adding your own key increases call limits. Quotes are fetched client-side—no backend or secrets required for publishing this page.

## Local site: manual portfolio capture
Run a lightweight static server to view the current site (no demo copy or placeholder data required):

1. From this repository root, start any static server (e.g., `python -m http.server 8000` or `npx serve .`).
2. Visit `http://localhost:8000` in your browser to load the portfolio page with your latest changes.
3. Optionally paste your Alpha Vantage API key into the **Alpha Vantage API key** field (leave it blank to use `demo`).
4. Add a holding by entering the ticker (e.g., `AAPL`), selecting an asset class, and typing the number of shares/units. The page will fetch the live USD price via the Alpha Vantage `GLOBAL_QUOTE` endpoint and update value/weight.
5. Click **Refresh prices** to reload quotes for all holdings at any time.
6. Use **Reset to sample** to restore the starter portfolio.

### Live pricing tips
- The built-in `demo` key is highly rate-limited and only returns quotes for a handful of symbols; provide your own free key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key) for reliable results.
- If a lookup is blocked (rate limit, unsupported symbol, or bad key), the page shows an inline warning on the price cell and summarises the number of issues beneath the **Live pricing** heading.

## Hosting it publicly
This is a static site—no build step or server is required.
- **GitHub Pages:** Commit `index.html`, `style.css`, and `app.js` to a public repo → Settings → Pages → deploy from the default branch. Share the resulting `https://<username>.github.io/<repo>` URL; that becomes your permanent link to the site.
- **Netlify/Vercel/Cloudflare Pages:** Drag-and-drop these files or point the host to the repo with a static-site preset (no build command needed). The generated HTTPS URL is immediately shareable and remains synced with your repo.
- **Any static host:** Serve the three files from object storage or a CDN bucket, then bookmark the public URL for quick access.

Once deployed, the README itself can serve as the landing reference—link to your chosen host in the section above so you always have a single place to find and share your personal portfolio page.

## Files
- `index.html`: Structure of the portfolio page, including the live pricing controls.
- `style.css`: Gradient-driven styling, responsive form/table layout, and helper text.
- `app.js`: Client-side logic for holdings state, live price retrieval via Alpha Vantage, and aggregate calculations.

## Next steps (roadmap)
- Persist holdings and API key to local storage.
- Add currency conversion for non-USD base currencies.
- Layer in charts for allocation and performance over time.
