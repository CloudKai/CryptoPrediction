from __future__ import annotations

"""FastAPI entrypoint.

This module only wires HTTP/WS routes to the runtime service.
Business logic (state, inference, streaming) lives in runtime.py.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import load_settings
from backend.app.constants import Interval
from backend.app.runtime import MarketRuntime
from backend.app.schemas import (
    CandleHistoryResponse,
    CoinsResponse,
    PredictionHistoryResponse,
    PredictionResponse,
)

settings = load_settings()
runtime = MarketRuntime(settings=settings)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Start background services when API boots, stop them on shutdown."""
    await runtime.startup()
    try:
        yield
    finally:
        await runtime.shutdown()


app = FastAPI(
    title="Crypto Prediction Backend",
    description="Binance-powered market and prediction backend for dashboard frontend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Simple health endpoint for local checks and container probes."""
    return {"ok": True}


@app.get("/api/coins", response_model=CoinsResponse)
async def get_coins():
    return CoinsResponse(coins=await runtime.coins_response())


@app.get("/api/market/{symbol}/history", response_model=CandleHistoryResponse)
async def get_market_history(
    symbol: str,
    interval: str | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=2000),
):
    # Normalize inputs first so all callers get consistent symbol/interval behavior.
    normalized_interval = runtime.validate_interval(interval)
    normalized_symbol = runtime.validate_symbol(symbol)
    candles = await runtime.get_market_history(normalized_symbol, normalized_interval, limit)
    return CandleHistoryResponse(symbol=normalized_symbol, interval=normalized_interval, candles=candles)


@app.get("/api/prediction/{symbol}", response_model=PredictionResponse)
async def get_prediction(
    symbol: str,
    interval: str | None = Query(default=None),
):
    # The runtime always returns the latest in-memory prediction snapshot.
    normalized_interval = runtime.validate_interval(interval)
    normalized_symbol = runtime.validate_symbol(symbol)
    prediction = await runtime.get_latest_prediction(normalized_symbol, normalized_interval)
    return PredictionResponse(prediction=prediction)


@app.get("/api/prediction/{symbol}/history", response_model=PredictionHistoryResponse)
async def get_prediction_history(
    symbol: str,
    interval: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=200),
):
    # History is produced from runtime updates and capped in-memory.
    normalized_interval = runtime.validate_interval(interval)
    normalized_symbol = runtime.validate_symbol(symbol)
    history = await runtime.get_prediction_history(normalized_symbol, normalized_interval, limit)
    return PredictionHistoryResponse(
        symbol=normalized_symbol,
        interval=normalized_interval,
        history=history,
    )


@app.websocket("/ws/market")
async def market_stream(
    websocket: WebSocket,
    symbol: str | None = Query(default=None),
    interval: str | None = Query(default=None),
):
    """Live prediction/candle stream.

    Optional query filters:
    - symbol=BTCUSDT
    - interval=5m
    """
    symbol_filter: str | None = None
    interval_filter: Interval | None = None

    if symbol:
        candidate = symbol.upper()
        # For WebSocket requests we close with protocol error instead of HTTPException.
        if candidate not in settings.tracked_symbols:
            await websocket.accept()
            await websocket.close(code=1008, reason="Unsupported symbol")
            return
        symbol_filter = candidate

    if interval:
        if interval not in settings.tracked_intervals:
            await websocket.accept()
            await websocket.close(code=1008, reason="Unsupported interval")
            return
        interval_filter = interval

    await runtime.hub.connect(websocket, symbol_filter, interval_filter)
    # Send one immediate snapshot so the client UI can render instantly.
    snapshot = await runtime.build_snapshot_event(symbol_filter, interval_filter)
    if snapshot:
        await websocket.send_json(snapshot)

    try:
        while True:
            # Keep the socket alive; we ignore inbound text payloads for now.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await runtime.hub.disconnect(websocket)
    except Exception:
        await runtime.hub.disconnect(websocket)
