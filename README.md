# Crypto Prediction Dashboard

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

- `/` landing page with project branding, architecture narrative, feature cards, and dashboard CTA.
- `/dashboard/[symbol]?interval=1m|5m|15m` real-time dashboard view.
- `/dashboard` redirects to the default symbol and interval.

## Backend Contract

Frontend-facing endpoints expected:

- `GET /api/coins`
- `GET /api/market/:symbol/history?interval=5m&limit=500`
- `GET /api/prediction/:symbol?interval=5m`
- `GET /api/prediction/:symbol/history?interval=5m`
- stream endpoint for live updates (demo defaults to internal SSE at `/api/market/stream`)

Python backend implements:

- `GET /api/coins`
- `GET /api/market/{symbol}/history`
- `GET /api/prediction/{symbol}`
- `GET /api/prediction/{symbol}/history`
- `WS /ws/market`

## Demo Mode vs Real Backend

This project ships with deterministic mocked route handlers so the app is runnable immediately.

To switch to your real backend:

1. Set `BACKEND_API_BASE_URL` to proxy REST from Next route handlers.
2. Set `NEXT_PUBLIC_WS_URL` to point dashboard stream to your backend WebSocket.

Both are optional in `.env.example`.

## Python Backend

Backend source lives in `backend/`.

```bash
cd backend
uv sync
uv run python -m backend.scripts.train_offline
uv run uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

Use `backend/.env.example` for backend runtime/training configuration.

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
  mock/
  server/
  stream/
backend/
  app/
  scripts/
  artifacts/
types/
```

## Local Setup

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
- Mock generation is deterministic (`lib/mock/market.ts`) for stable portfolio demos.
- Frontend hooks (`hooks/`) orchestrate snapshot loading + live stream reconciliation.
- Stream transport is swappable (`lib/stream/adapter.ts`):
  - defaults to internal SSE demo
  - uses `NEXT_PUBLIC_WS_URL` when configured
- UI is componentized for clear separation between landing, dashboard widgets, and layout primitives.

## Important Constraint

This frontend is intentionally analytics-only:

- no authentication
- no trading execution
- no broker/order integrations
