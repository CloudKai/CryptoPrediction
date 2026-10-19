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
- `GET /api/market/{symbol}/history?range=live|1d|1w|1mo|1y`
- `GET /api/prediction/{symbol}?interval=5m`
- `GET /api/prediction/{symbol}?range=live|1d|1w|1mo|1y`
- `GET /api/prediction/{symbol}/history?interval=5m&limit=25`
- `GET /api/prediction/{symbol}/history?range=live|1d|1w|1mo|1y&limit=25`
- `WS /ws/market?symbol=BTCUSDT&interval=5m` (filters optional)
- `WS /ws/market?symbol=BTCUSDT&range=live|1d|1w|1mo|1y` (filters optional)

## Setup

```bash
cd /Users/kaiming/Desktop/Personal\ Projects/CryptoPrediction
uv sync --project backend
```

## Train models offline

```bash
cd /Users/kaiming/Desktop/Personal\ Projects/CryptoPrediction
uv run --project backend python -m backend.scripts.train_offline
```

Artifacts are written to `backend/artifacts/`.

## Run backend API

```bash
cd /Users/kaiming/Desktop/Personal\ Projects/CryptoPrediction
uv run --project backend uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

## Frontend wiring

In the root `.env.local`:

```bash
BACKEND_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/market
```

## Range mapping used by backend

- `live` -> `1m`, about 60 candles
- `1d` -> `5m`, about 288 candles
- `1w` -> `1h`, about 168 candles
- `1mo` -> `4h`, about 180 candles
- `1y` -> `1d`, about 365 candles
