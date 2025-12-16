# Portfolio Snapshot (Next.js + Yahoo Finance)

A production-ready Next.js (App Router) portal that fetches live prices from Yahoo Finance server-side every 3 hours, stores snapshots in Postgres via Prisma, and exposes a simple UI plus JSON API. Cron-driven refreshes run in production (Vercel) without any manual API keys.

**Live portal:** https://your-vercel-deployment-url.vercel.app

## Features
- Server-side Yahoo Finance pricing via `yahoo-finance2` (no browser CORS issues, no API key needed).
- Automatic refresh every 3 hours through Vercel Cron hitting an internal API route.
- Snapshots persisted in Postgres with Prisma so history and "Last updated" times are always available.
- Searchable ticker combobox backed by Yahoo Finance search (global equities/ETFs/bonds), with selections persisted to Postgres for cron ingestion.
- API routes for cron ingestion, ticker registry, symbol search, and retrieving the latest prices/history (`/api/cron`, `/api/tickers`, `/api/symbols/search`, `/api/prices`).
- UI: overview table of tracked tickers and a per-ticker detail page with a lightweight SVG chart of recent snapshots.
- Cache busting by default: all routes return `Cache-Control: no-store` and export `dynamic = 'force-dynamic'`.

## Configuration
Set environment variables (locally via `.env`, in Vercel via Project Settings → Environment Variables):

- `TICKERS` – optional comma-separated list of symbols used to seed the database when empty (e.g., `AAPL,MSFT,TSLA,BTC-USD`).
- `DATABASE_URL` – Postgres connection string (Vercel Postgres, Supabase, RDS, etc.).
- `ALLOW_CRON` – optional; set to `true` if you need to call `/api/cron` outside production for manual testing.

## Development setup
1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env` and provide a Postgres `DATABASE_URL` (and optional `TICKERS`). SQLite is also supported for local hacking by changing the Prisma provider to `sqlite` if preferred.
3. Apply the schema locally (creates the `PriceSnapshot` and `Ticker` tables):
   ```bash
   npx prisma generate
   npx prisma migrate deploy --schema prisma/schema.prisma
   ```
4. Run the app: `npm run dev` then open http://localhost:3000.
5. (Optional) trigger a manual price capture: visit http://localhost:3000/api/cron (requires `ALLOW_CRON=true`).

## Production deployment (Vercel)
1. Push this repo to GitHub and import it into Vercel.
2. In Vercel → Settings → Environment Variables, add `DATABASE_URL` (and optionally `TICKERS`, `ALLOW_CRON` for staging).
3. Add the cron schedule by keeping the provided `vercel.json` checked into the repo. Vercel Cron will call `/api/cron` every 3 hours **only in production**.
4. Deploy. Once live, confirm the portal at your production URL (e.g., https://your-vercel-deployment-url.vercel.app) and bookmark it.
5. View cron run logs in Vercel → Project → Deployments → Functions Logs; look for entries prefixed with `[cron]`.

## Using the portal
- Search for any public equity/ETF/bond via the combobox on the home page. Selections are saved to Postgres and included in cron runs.
- The overview table shows the latest captured price, change, currency, and "Last updated" timestamp.
- Click a ticker to view its recent snapshot history and chart. If no data exists yet, run the cron or wait for the next scheduled run.
- `/api/prices?symbol=XYZ` exposes JSON history per ticker; `/api/prices` lists the latest snapshot for each tracked symbol.

## API routes
- `GET /api/cron` – fetches Yahoo Finance quotes for all DB tickers (seeding from `TICKERS` if empty) and writes snapshots to Postgres. Guarded to production by default; set `ALLOW_CRON=true` to run locally.
- `GET /api/prices` – returns the latest snapshot per ticker (after ensuring DB seed).
- `GET /api/prices?symbol=AAPL` – returns the recent history for the given symbol.
- `GET /api/symbols/search?q=...` – server-side Yahoo Finance search used by the combobox.
- `POST /api/tickers` – saves a ticker to the registry; UI calls this after selection. `GET /api/tickers` lists tracked symbols.

All routes disable caching via `Cache-Control: no-store` and `dynamic = 'force-dynamic'`.

## Data model (Prisma)
- `Ticker`: `id`, `symbol` (unique), `createdAt`. Stored symbols drive cron ingestion.
- `PriceSnapshot`: `id`, `symbol`, `currency`, `price`, `change`, `changePercent`, `source`, `createdAt`.
- Migrations live in `prisma/migrations` (`0001_init` for price snapshots, `0002_add_tickers` for ticker registry). Apply with `npm run prisma:migrate` or `prisma migrate deploy` during build on Vercel.

## Scheduler details
- `vercel.json` defines `0 */3 * * *` to call `/api/cron` every 3 hours.
- Cron route seeds DB tickers from `TICKERS` if empty, logs start/finish plus captured count; viewable in Vercel logs.
- To test outside production, set `ALLOW_CRON=true` and hit `/api/cron` manually.

## Troubleshooting
- **Cron not firing**: ensure the project is deployed to production on Vercel, `vercel.json` is present, and `DATABASE_URL` is set. Check Vercel Function logs for `[cron]` entries.
- **Caching issues**: all routes send `Cache-Control: no-store`; if you see stale data behind a CDN, force-reload or confirm no custom caching headers are added by a proxy.
- **Yahoo failures / throttling**: search and cron are server-side; transient errors return empty results with error messaging in the UI. Cron continues past individual symbol failures (logged). If a symbol consistently fails, remove it via the DB or avoid re-adding it.
- **Rate limiting**: Vercel Cron runs every 3 hours; if you trigger manual runs, avoid rapid calls. The Yahoo client may return fewer snapshots when rate limited; logs will note failures.
- **Database connection**: confirm `DATABASE_URL` correctness and that the database allows connections from Vercel. Run `npm run prisma:generate` locally to validate schema. For schema drift, rerun migrations locally then redeploy.

## File overview
- `app/api/cron/route.ts` – cron ingestion endpoint.
- `app/api/prices/route.ts` – JSON feed for latest/history.
- `app/api/symbols/search/route.ts` – server-side Yahoo Finance search for the combobox.
- `app/api/tickers/route.ts` – ticker registry (POST to save, GET to list/seed).
- `app/page.tsx` – overview UI of all tickers plus searchable selector.
- `app/tickers/[symbol]/page.tsx` – per-ticker detail with chart.
- `app/lib/pricing.ts` – Yahoo Finance fetching + DB helpers.
- `app/lib/prisma.ts` – Prisma client singleton.
- `src/components/LineChart.tsx` – lightweight SVG chart renderer.
- `src/components/TickerSelect.tsx` – client combobox to search and save tickers.
- `prisma/schema.prisma` & `prisma/migrations/*` – data model and migrations.
- `vercel.json` – Vercel Cron configuration (every 3 hours).
