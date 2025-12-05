# Unified Investment Visualization Platform

## Overview
This project aims to provide individuals with a single place to visualize and understand their total investment wealth across multiple brokers and manually tracked assets. Users can sign up with an email, connect supported brokerages (e.g., IBKR, Trade Republic), or add holdings manually by ticker symbol to view aggregate portfolio value, allocation weights, and performance.

## Core objectives
- **Unified visibility:** Combine holdings from disparate platforms so users always know their true net invested wealth.
- **Flexible data entry:** Support both manual position entry and automated brokerage connections.
- **Clear insights:** Present aggregate portfolio value, position weights, time-weighted returns, and performance over customizable periods.

## Target users
Individuals with investments spread across multiple platforms who want a consolidated view of their holdings, allocation, and performance.

## Key features
### Account & authentication
- Email-based sign-up, login, and password reset.
- Multi-factor authentication optional per user.

### Portfolio capture
- **Manual input:** Add or edit positions by ticker, quantity, cost basis, and optional tags. Support global tickers via symbol search (e.g., ISIN, CUSIP, FIGI, and exchange-specific tickers).
- **Broker connectors:** OAuth or API-key based connections to brokers such as Interactive Brokers (IBKR), Trade Republic, and others. Scheduled sync jobs pull latest positions, transactions, and cash balances.

### Portfolio analytics
- Aggregate portfolio market value and cash across all sources.
- Position- and asset-class weights with drill-down by account, region, sector, or custom tags.
- Performance charts (e.g., time-weighted and money-weighted returns), contributions/withdrawals, and realized/unrealized P&L.
- FX conversion to a base currency using live or delayed rates.

### Visualizations
- Dashboard with total value, daily/MTD/YTD performance, and allocation breakdowns (pie, bar, stacked area).
- Position tables with filtering, sorting, and export (CSV/Excel).
- Alerts for allocation drift or unusual movements.

### Data integrity & controls
- Audit trail for edits and sync imports.
- Reconciliation view to resolve symbol mismatches or stale connections.
- Rate limiting and retry logic for external API calls.

## Architecture (proposed)
- **Frontend:** Web app (React/Vue/Svelte) using a component library for accessible charts and tables.
- **Backend API:** REST/GraphQL service (e.g., Python/FastAPI or Node/NestJS) providing authentication, portfolio aggregation, and analytics endpoints.
- **Worker tier:** Background jobs for brokerage sync, FX rate ingestion, and performance calculations.
- **Data storage:** Relational database (e.g., Postgres) with schemas for users, accounts, positions, transactions, prices, and FX rates. Object storage for reports/exports.
- **Integrations:** Adapter pattern for each broker; price/FX data from providers such as Polygon.io, Alpha Vantage, or open-source feeds.
- **Infrastructure:** Containerized services, CI/CD, observability (metrics/logs/traces), and secrets management.

## Data model highlights
- `users`: authentication and profile metadata.
- `accounts`: linked broker accounts or manual portfolios.
- `positions`: current holdings with quantities, cost basis, and pricing metadata.
- `transactions`: fills, dividends, fees, and cash movements for performance calculations.
- `prices`: historical/end-of-day quotes; `fx_rates` for currency conversion.

## User flows
1. **Sign up with email** → verify email → set base currency.
2. **Add holdings manually** → search ticker (or enter ISIN) → set quantity & cost basis → view updated weights.
3. **Connect broker** → complete OAuth/API-key flow → scheduled sync imports positions and transactions → dashboard updates automatically.
4. **Monitor performance** → view consolidated value and returns → export holdings or set alerts for allocation drift.

## Security & compliance considerations
- Enforce TLS, secure session cookies, and encryption at rest for secrets and PII.
- Principle of least privilege for broker connections; avoid storing unnecessary credentials.
- Audit logs for access and data changes.
- Regional data residency and GDPR/CCPA readiness where applicable.

## Demo: manual portfolio capture
A lightweight static demo is included to show the manual ticker entry flow and real-time aggregate calculations.

### How to run locally
1. From the repository root, start a simple HTTP server:
   ```bash
   python -m http.server 8000
   ```
2. Open http://localhost:8000 in your browser.
3. Add ticker symbols, select an asset class, and enter shares plus price per unit. The demo will show aggregate portfolio value and per-position weights. You can edit shares/prices inline or reset to sample data (including cash, gold, silver, and major crypto) at any time.

### What the demo covers
- Manual ticker entry with asset class selection
- Share and price inputs with inline edits and deletion
- Aggregate portfolio value and allocation weights that respond instantly to changes

### Next steps for the demo
- Persist holdings to local storage
- Add quantity/cost basis fields and basic P&L
- Expand visuals with allocation charts and time-series performance

## Next steps
- Define MVP scope (manual portfolio + IBKR connector + basic allocations/performance).
- Flesh out API contracts and adapter interfaces for brokers.
- Create schema migrations and seed data for sample portfolios.
- Build initial dashboard with manual entry and aggregated metrics.
