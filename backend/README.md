# Crypto Prediction Backend

Python backend service for the Crypto Prediction Dashboard frontend.

## What it does

- Fetches historical klines via Binance REST.
- Trains logistic-regression-style models offline (one model per symbol + interval).
- Subscribes to Binance WebSocket kline streams for live updates.
- Infers UP/DOWN next-interval direction with confidence.
- Exposes frontend-compatible REST and WebSocket endpoints.

## Endpoints

- `GET /api/coins`
- `GET /api/market/{symbol}/history?interval=5m&limit=500`
- `GET /api/prediction/{symbol}?interval=5m`
- `GET /api/prediction/{symbol}/history?interval=5m&limit=25`
- `WS /ws/market?symbol=BTCUSDT&interval=5m` (filters optional)

## Setup

```bash
cd backend
uv sync
```

## Train models offline

```bash
cd backend
uv run python -m backend.scripts.train_offline
```

Artifacts are written to `backend/artifacts/`.

## Run backend API

```bash
cd backend
uv run uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

## Frontend wiring

In the root `.env.local`:

```bash
BACKEND_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/market
```

