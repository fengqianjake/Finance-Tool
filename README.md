# Portfolio Snapshot (Next.js + Yahoo Finance)

A production-ready Next.js (App Router) portal that tracks tickers via Yahoo Finance and lets you record portfolio holdings with daily FX-aware valuations. Prices and FX snapshots are stored in Postgres with Prisma so the UI and JSON feeds always render from the database.

**Live portal:** https://your-vercel-deployment-url.vercel.app/portal

## Features
- Server-side Yahoo Finance pricing via `yahoo-finance2` (no browser CORS issues, no API key needed).
- Daily refresh through Vercel Cron hitting an internal `/api/cron` route (production only).
- Snapshots persisted in Postgres with Prisma for price history and FX history.
- Searchable ticker combobox backed by Yahoo Finance search (global equities/ETFs/bonds), with selections persisted to Postgres for cron ingestion.
- Portfolio portal (`/portal`) to add holdings across asset classes (stocks, ETFs, cash in USD/EUR/CNY, gold, silver, bitcoin), select a display currency (USD/EUR/CNY), and view total value with FX conversion.
- FX snapshots captured daily (EUR base from frankfurter.app) with triangulation for USD/EUR/CNY conversions and “last updated” timestamps.
- API routes for cron ingestion, ticker registry, symbol search, holdings, portfolio preference, and retrieving the latest prices/history (`/api/cron`, `/api/tickers`, `/api/symbols/search`, `/api/prices`, `/api/holdings`, `/api/portfolio`).
- Cache busting by default: all routes return `Cache-Control: no-store` and export `dynamic = 'force-dynamic'`.

## Configuration
Set environment variables (locally via `.env`, in Vercel via Project Settings → Environment Variables):

- `TICKERS` – optional comma-separated list of symbols used to seed the database when empty (e.g., `AAPL,MSFT,TSLA,BTC-USD`).
- `DATABASE_URL` – Postgres connection string (Vercel Postgres, Supabase, RDS, etc.).
- `ALLOW_CRON` – optional; set to `true` if you need to call `/api/cron` outside production for manual testing.

## Development setup
1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env` and provide a Postgres `DATABASE_URL` (and optional `TICKERS`).
3. Apply the schema locally (creates the ticker, price snapshot, portfolio, holdings, and FX tables):
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
4. Run the app: `npm run dev` then open http://localhost:3000.
5. (Optional) trigger a manual refresh: visit http://localhost:3000/api/cron (requires `ALLOW_CRON=true`).

## Production deployment (Vercel)
1. Push this repo to GitHub and import it into Vercel.
2. In Vercel → Settings → Environment Variables, add `DATABASE_URL` (and optionally `TICKERS`, `ALLOW_CRON` for staging).
3. Keep `vercel.json` checked into the repo. Vercel Cron will call `/api/cron` **once per day in production**.
4. Deploy. Once live, bookmark the portal at `https://your-vercel-deployment-url.vercel.app/portal` (replace with your Vercel domain).
5. View cron run logs in Vercel → Project → Deployments → Functions Logs; look for entries prefixed with `[cron]`.

## Using the portal
- Search for any public equity/ETF/bond via the combobox on the home page. Selections are saved to Postgres and included in cron runs.
- Open `/portal` to record holdings across stocks/ETFs, cash (USD/EUR/CNY), gold, silver, and bitcoin. Symbols are optional for cash; metals/bitcoin map to common Yahoo tickers (GC=F, SI=F, BTC-USD).
- Choose a display currency (USD/EUR/CNY); the preference is saved in Postgres and applied to all valuations.
- Totals use the latest price snapshots and latest FX snapshots; if a price or FX rate is missing, the UI will show a placeholder while still rendering safely.
- `/api/holdings` returns the current portfolio snapshot JSON (values, FX timestamps); `/api/portfolio` reads/updates the saved display currency.

## API routes
- `GET /api/cron` – refreshes FX (daily) and fetches Yahoo Finance quotes for all DB tickers (seeding from `TICKERS` if empty) and writes snapshots to Postgres. Guarded to production by default; set `ALLOW_CRON=true` to run locally.
- `GET /api/prices` – returns the latest snapshot per ticker (after ensuring DB seed).
- `GET /api/prices?symbol=AAPL` – returns the recent history for the given symbol.
- `GET /api/symbols/search?q=...` – server-side Yahoo Finance search used by the combobox.
- `POST /api/tickers` – saves a ticker to the registry; UI calls this after selection. `GET /api/tickers` lists tracked symbols.
- `GET /api/holdings` – returns the current portfolio valuation using stored prices and FX.
- `POST /api/holdings` – create a holding (asset class, optional symbol, units). `DELETE /api/holdings?id=...` removes a holding.
- `GET /api/portfolio` – returns the saved display currency and valuation. `PUT /api/portfolio` updates the display currency.

All routes disable caching via `Cache-Control: no-store` and `dynamic = 'force-dynamic'`.

## Data model (Prisma)
- `Ticker`: `id`, `symbol` (unique), `createdAt`. Stored symbols drive cron ingestion.
- `PriceSnapshot`: `id`, `symbol`, `currency`, `price`, `change`, `changePercent`, `source`, `createdAt`.
- `Portfolio`: `id`, `displayCurrency`, timestamps. Holds user display preference and relations to holdings.
- `Holding`: `id`, `assetClass` (enum), `symbol?`, `units` (decimal), `portfolioId`, timestamps.
- `FxRateSnapshot`: `id`, `baseCurrency`, `quoteCurrency`, `rate`, `asOfDate` (00:00 UTC), `source`, timestamps, unique per pair/day.

Migrations live in `prisma/migrations` (0001_init, 0002_add_tickers, 0003_portfolio_fx). Apply with `npx prisma migrate dev` locally or `prisma migrate deploy` in CI/Vercel.

## Scheduler details
- `vercel.json` defines a daily cron (`0 0 * * *`) calling `/api/cron` in production.
- The cron route seeds DB tickers from `TICKERS` if empty, logs start/finish plus captured count, refreshes FX via frankfurter.app, and stores price snapshots from Yahoo Finance.
- To test outside production, set `ALLOW_CRON=true` and hit `/api/cron` manually.

## Troubleshooting
- **Cron not firing**: ensure the project is deployed to production on Vercel, `vercel.json` is present, and `DATABASE_URL` is set. Check Vercel Function logs for `[cron]` entries.
- **Caching issues**: all routes send `Cache-Control: no-store`; if you see stale data behind a CDN, force-reload or confirm no custom caching headers are added by a proxy.
- **Yahoo failures / throttling**: search and cron are server-side; transient errors return empty results with error messaging in the UI. Cron continues past individual symbol failures (logged). If a symbol consistently fails, remove it via the DB or avoid re-adding it.
- **FX failures**: FX refresh falls back to the last stored rates. If none exist yet, valuations requiring conversion will show placeholders until the next successful run.
- **Rate limiting**: Cron runs daily; avoid triggering manual runs repeatedly. The Yahoo client may return fewer snapshots when rate limited; logs will note failures.
- **Database connection**: confirm `DATABASE_URL` correctness and that the database allows connections from Vercel. Run `npm run prisma:generate` locally to validate schema. For schema drift, rerun migrations locally then redeploy.

## File overview
- `app/api/cron/route.ts` – cron ingestion endpoint (FX + prices).
- `app/api/prices/route.ts` – JSON feed for latest/history.
- `app/api/symbols/search/route.ts` – server-side Yahoo Finance search for the combobox.
- `app/api/tickers/route.ts` – ticker registry (POST to save, GET to list/seed).
- `app/api/holdings/route.ts` – holdings CRUD + portfolio snapshot JSON.
- `app/api/portfolio/route.ts` – display currency preference + portfolio snapshot.
- `app/page.tsx` – overview UI of all tickers plus searchable selector.
- `app/portal/page.tsx` – portfolio portal landing/server wrapper.
- `src/components/PortfolioPortal.tsx` – client holdings UI with add/remove and currency selector.
- `app/tickers/[symbol]/page.tsx` – per-ticker detail with chart.
- `app/lib/pricing.ts` – Yahoo Finance fetching + DB helpers.
- `app/lib/fx.ts` – FX fetch/store/convert helpers.
- `app/lib/portfolio.ts` – portfolio valuation helpers.
- `app/lib/prisma.ts` – Prisma client singleton.
- `src/components/LineChart.tsx` – lightweight SVG chart renderer.
- `src/components/TickerSelect.tsx` – client combobox to search and save tickers.
- `prisma/schema.prisma` & `prisma/migrations/*` – data model and migrations.
- `vercel.json` – Vercel Cron configuration (daily).
