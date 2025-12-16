# Portfolio Snapshot (Next.js + Yahoo Finance)

A production-ready Next.js (App Router) portal that fetches live prices from Yahoo Finance server-side every 3 hours, stores snapshots in Postgres via Prisma, and exposes a simple UI plus JSON API. Cron-driven refreshes run in production (Vercel) without any manual API keys.

**Live portal:** https://your-vercel-deployment-url.vercel.app

## Features
- Server-side Yahoo Finance pricing via `yahoo-finance2` (no browser CORS issues, no API key needed).
- Automatic refresh every 3 hours through Vercel Cron hitting an internal API route.
- Snapshots persisted in Postgres with Prisma so history and "Last updated" times are always available.
- API routes for cron ingestion and for retrieving the latest prices/history (`/api/cron`, `/api/prices`).
- UI: overview table of configured tickers and a per-ticker detail page with a lightweight SVG chart of recent snapshots.
- Cache busting by default: all routes return `Cache-Control: no-store` and export `dynamic = 'force-dynamic'`.

## Configuration
Set environment variables (locally via `.env`, in Vercel via Project Settings → Environment Variables):

- `TICKERS` – comma-separated list of symbols (e.g., `AAPL,MSFT,TSLA,BTC-USD`).
- `DATABASE_URL` – Postgres connection string (Vercel Postgres, Supabase, RDS, etc.).
- `ALLOW_CRON` – optional; set to `true` if you need to call `/api/cron` outside production for manual testing.

## Development setup
1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env` and fill in `TICKERS` and a Postgres `DATABASE_URL`. SQLite is also supported for local hacking by changing the Prisma provider to `sqlite` if preferred.
3. Apply the schema locally (creates the `PriceSnapshot` table):
   ```bash
   npx prisma generate
   npx prisma migrate deploy --schema prisma/schema.prisma
   ```
4. Run the app: `npm run dev` then open http://localhost:3000.
5. (Optional) trigger a manual price capture: visit http://localhost:3000/api/cron (requires `ALLOW_CRON=true`).

## Production deployment (Vercel)
1. Push this repo to GitHub and import it into Vercel.
2. In Vercel → Settings → Environment Variables, add `TICKERS` and `DATABASE_URL` (and optionally `ALLOW_CRON` for staging).
3. Add the cron schedule by keeping the provided `vercel.json` checked into the repo. Vercel Cron will call `/api/cron` every 3 hours **only in production**.
4. Deploy. Once live, confirm the portal at your production URL (e.g., https://your-vercel-deployment-url.vercel.app) and bookmark it.
5. View cron run logs in Vercel → Project → Deployments → Functions Logs; look for entries prefixed with `[cron]`.

## API routes
- `GET /api/cron` – fetches Yahoo Finance quotes for all tickers and writes snapshots to Postgres. Guarded to production by default; set `ALLOW_CRON=true` to run locally.
- `GET /api/prices` – returns the latest snapshot per ticker.
- `GET /api/prices?symbol=AAPL` – returns the recent history for the given symbol.

Both routes disable caching via `Cache-Control: no-store` and `dynamic = 'force-dynamic'`.

## Data model (Prisma)
- `PriceSnapshot`: `id`, `symbol`, `currency`, `price`, `change`, `changePercent`, `source`, `createdAt` (indexed by `symbol, createdAt`).
- Initial migration is in `prisma/migrations/0001_init/migration.sql`; apply with `npm run prisma:migrate` or `prisma migrate deploy` during build on Vercel.

## Scheduler details
- `vercel.json` defines `0 */3 * * *` to call `/api/cron` every 3 hours.
- Cron route logs start/finish plus captured count; viewable in Vercel logs.
- To test outside production, set `ALLOW_CRON=true` and hit `/api/cron` manually.

## Troubleshooting
- **Cron not firing**: ensure the project is deployed to production on Vercel, `vercel.json` is present, and `TICKERS`/`DATABASE_URL` are set. Check Vercel Function logs for `[cron]` entries.
- **Caching issues**: all routes send `Cache-Control: no-store`; if you see stale data behind a CDN, force-reload or confirm no custom caching headers are added by a proxy.
- **Yahoo failures**: the cron continues past individual symbol failures (logged). Verify the ticker exists on Yahoo (e.g., `BTC-USD`, `XAUUSD=X` for gold). If a symbol consistently fails, remove it from `TICKERS`.
- **Rate limiting**: Vercel Cron runs every 3 hours; if you trigger manual runs, avoid rapid calls. The Yahoo client is resilient but may return fewer snapshots when rate limited; logs will note failures.
- **Database connection**: confirm `DATABASE_URL` correctness and that the database allows connections from Vercel. Run `npm run prisma:generate` locally to validate schema.

## File overview
- `app/api/cron/route.ts` – cron ingestion endpoint.
- `app/api/prices/route.ts` – JSON feed for latest/history.
- `app/page.tsx` – overview UI of all tickers.
- `app/tickers/[symbol]/page.tsx` – per-ticker detail with chart.
- `app/lib/pricing.ts` – Yahoo Finance fetching + DB helpers.
- `app/lib/prisma.ts` – Prisma client singleton.
- `src/components/LineChart.tsx` – lightweight SVG chart renderer.
- `prisma/schema.prisma` & `prisma/migrations/0001_init/migration.sql` – data model and initial migration.
- `vercel.json` – Vercel Cron configuration (every 3 hours).
