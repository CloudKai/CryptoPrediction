# Crypto Prediction Dashboard

Discover is now the default entry page: a grouped budget/profile form with a dedicated allocation-results view. Crypto browsing lives at `/markets`; US/Singapore stock browsing lives at `/stocks`, each with an activity-ranked top ten, search and small observed-price charts. See [stock and mixed-market implementation](docs/STOCKS_IMPLEMENTATION.md). See [Discover implementation](docs/DISCOVER_IMPLEMENTATION.md) for scope, storage, validation, and the optional allocation-service contract. Experimental Discover uses configured OpenAI access and current evidence for crypto, stock or mixed USD proposals. The separate reviewed fixed-strategy path still requires its policy and evaluation report. Accounts remain unavailable. See [financial engine](docs/FINANCIAL_ENGINE.md) for calculations, research APIs, release gates, and the evaluation workflow.

Full-stack project with:

- **Next.js App Router frontend** (dashboard + landing page)
- **Python FastAPI backend** (Binance REST + WebSocket ingestion, offline model training, live inference)

The frontend still only consumes backend endpoints and never calls Binance directly.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- TradingView Lightweight Charts
- FastAPI
- NumPy logistic regression baseline (offline-trained artifacts)

## Pages

- `/` Discover budget/profile form.
- `/discover/results` allocation results or explicit unavailable-analysis state.
- `/markets` monitoring overview dashboard.
- `/dashboard/[symbol]?range=live|1d|1w|1mo|1y` shareable symbol dashboard view.
- `/latest-news` crypto news grouped into `Latest News`, `This Week`, and `This Month`.
- `/dashboard` redirects to the default symbol and chart range.

## Backend Contract

Frontend-facing endpoints expected:

- `GET /api/coins`
- `GET /api/market/:symbol/history?interval=5m&limit=500`
- `GET /api/market/:symbol/history?range=live|1d|1w|1mo|1y`
- `GET /api/prediction/:symbol?interval=5m`
- `GET /api/prediction/:symbol?range=live|1d|1w|1mo|1y`
- `GET /api/prediction/:symbol/history?interval=5m`
- `GET /api/prediction/:symbol/history?range=live|1d|1w|1mo|1y`
- `WS /ws/market?symbol=BTCUSDT&range=live|1d|1w|1mo|1y`

Python backend implements:

- `GET /api/coins`
- `GET /api/market/{symbol}/history`
- `GET /api/prediction/{symbol}`
- `GET /api/prediction/{symbol}/history`
- `WS /ws/market`

## Frontend and Backend Sync

This project is backend-only now. The frontend shows `No data` until both backend env vars are configured:

1. Set `BACKEND_API_BASE_URL=http://localhost:8000` in `.env.local`
2. Set `NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/market` in `.env.local`
3. Start the Python backend before opening the dashboard

News API configuration:

4. Set `NEWSDATA_API_KEY=...` in `.env.local` for `/api/crypto-news`

## Python Backend

Backend source lives in `backend/`.

```bash
uv sync --project backend
uv run --project backend python -m backend.scripts.train_offline
uv run --project backend uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

Use `backend/.env.example` for backend runtime/training configuration.

Range mapping used across frontend and backend:

- `live` -> `1m`, about 60 candles
- `1d` -> `5m`, about 288 candles
- `1w` -> `1h`, about 168 candles
- `1mo` -> `4h`, about 180 candles
- `1y` -> `1d`, about 365 candles

## Project Structure

```text
app/
  api/
  dashboard/
components/
  dashboard/
  landing/
  layout/
hooks/
lib/
  api/
  server/
  stream/
backend/
  app/
  scripts/
  artifacts/
types/
```

## Local Setup

Copy [`.env.example`](.env.example) to `.env.local` if you do not already have one. The template includes local backend URLs and blank fields for these free-tier keys:

| Variable | Get a free key | Limits |
| --- | --- | --- |
| `NEWSDATA_API_KEY` | [NewsData signup](https://newsdata.io/register) | [200 credits/day, 12-hour delay; no full article text](https://newsdata.io/blog/pricing-plan-in-newsdata-io/). Endpoint entitlements apply. |
| `COINGECKO_DEMO_API_KEY` | [CoinGecko Developers Dashboard](https://www.coingecko.com/en/developers/dashboard) | [10,000 calls/month, 100/minute, 1-year history; attribution required](https://www.coingecko.com/en/api/pricing). For crypto browsing and research; it does not provide stock data. |

The legacy monitor backend uses Binance public REST/WebSocket data without a trading API key; access depends on deployment region and upstream terms. Start the backend separately using the commands above. Optional backend overrides are in [`backend/.env.example`](backend/.env.example); load a copied `backend/.env` explicitly with `uvicorn ... --env-file backend/.env`.

This free configuration keeps AI recommendations and scenario releases disabled. The existing AI adapter uses [paid OpenAI API inference](https://developers.openai.com/api/docs/pricing), and CoinGecko Demo cannot supply enough history for the current projection checks. `ANALYSIS_ACCESS_TOKEN` is a local secret you generate yourself, not a paid API key. US/SG stock browsing uses experimental free public Yahoo Finance/SGX adapters without a new stock API key; see [coverage and limitations](docs/STOCKS_IMPLEMENTATION.md). Free signup does not grant unrestricted public redistribution or AI-processing rights; see the [provider research](docs/research/CRYPTO_AND_STOCK_API_RECOMMENDATION.md) before public deployment.

For the optional OpenAI Discover integration, follow [OpenAI setup](docs/OPENAI_DISCOVER_SETUP.md). Run `npm run check:analysis` to identify missing configuration without generating a paid response or printing secrets.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run build
```

Backend syntax check:

```bash
python3 -m compileall backend
```

## Architecture Notes

- Reusable domain types live in `types/market.ts`.
- Frontend routes are backend-only: if `BACKEND_API_BASE_URL` or `NEXT_PUBLIC_WS_URL` are missing, the UI shows a `No data` setup message instead of falling back to mock data.
- `/api/crypto-news` uses a server-only NewsData key, writes a generated JSON cache at `data/news-cache.json`, and refreshes upstream on a 12-hour window to reduce credit usage. Runtime caches and test output are excluded from Git.
- Frontend hooks (`hooks/`) orchestrate snapshot loading + live stream reconciliation.
- Stream transport is swappable (`lib/stream/adapter.ts`):
  - stays disconnected until `NEXT_PUBLIC_WS_URL` is configured
  - uses `NEXT_PUBLIC_WS_URL` when configured
- UI is componentized for clear separation between landing, dashboard widgets, and layout primitives.

## Important Constraint

This frontend is intentionally analytics-only:

- no authentication
- no trading execution
- no broker/order integrations
# CryptoPrediction
