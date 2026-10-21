from __future__ import annotations

"""FastAPI entrypoint.

This module only wires HTTP/WS routes to the runtime service.
Business logic (state, inference, streaming) lives in runtime.py.
"""

from contextlib import asynccontextmanager
import asyncio
import time

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import load_settings
from backend.app.constants import Interval
from backend.app.news import CryptoNewsService
from backend.app.hourly_outlook import METHOD, outlook
from backend.app.runtime import MarketRuntime
from backend.app.schemas import (
    CandleHistoryResponse,
    CoinsResponse,
    NewsResponse,
    PredictionHistoryResponse,
    PredictionResponse,
)

settings = load_settings()
runtime = MarketRuntime(settings=settings)
news_service = CryptoNewsService()
# Bound by the configured symbol catalog; one in-flight computation per symbol.
outlook_cache: dict[str, tuple[int, dict]] = {}
outlook_locks: dict[str, asyncio.Lock] = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Start background services when API boots, stop them on shutdown."""
    await runtime.startup()
    try:
        yield
    finally:
        await runtime.shutdown()
        await news_service.close()


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


@app.get("/api/news", response_model=NewsResponse)
async def get_news(limit: int = Query(default=6, ge=1, le=12)):
    try:
        items = await news_service.fetch_latest(limit=limit)
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"News unavailable: {error}") from error
    return NewsResponse(items=items)


@app.get("/api/market/{symbol}/history", response_model=CandleHistoryResponse)
async def get_market_history(
    symbol: str,
    interval: str | None = Query(default=None),
    range: str | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=4000),
):
    # Normalize inputs first so all callers get consistent symbol/interval behavior.
    normalized_interval = runtime.resolve_interval(interval, range)
    resolved_limit = runtime.resolve_history_limit(limit, range)
    normalized_symbol = runtime.validate_symbol(symbol)
    candles = await runtime.get_market_history(normalized_symbol, normalized_interval, resolved_limit)
    return CandleHistoryResponse(symbol=normalized_symbol, interval=normalized_interval, candles=candles,
                                 observedAt=runtime.market_observed_at(normalized_symbol, normalized_interval))


@app.get("/api/prediction/{symbol}", response_model=PredictionResponse)
async def get_prediction(
    symbol: str,
    interval: str | None = Query(default=None),
    range: str | None = Query(default=None),
):
    # Prediction is intentionally locked to the 15m forecast track.
    normalized_interval: Interval = "15m"
    normalized_symbol = runtime.validate_symbol(symbol)
    prediction = await runtime.get_latest_prediction(normalized_symbol, normalized_interval)
    return PredictionResponse(prediction=prediction)


@app.get("/api/market/{symbol}/outlook")
async def get_hourly_outlook(symbol: str):
    symbol = runtime.validate_symbol(symbol)
    lock = outlook_locks.setdefault(symbol, asyncio.Lock())
    async with lock:
        hour = int(time.time() // 3600)
        cached = outlook_cache.get(symbol)
        if cached and cached[0] == hour:
            return cached[1]
        try:
            # Dedicated history: never relabel 15m predictions as hourly forecasts.
            candles = await runtime.binance.fetch_klines_paginated(symbol, "1h", 2000)
            forecasts = await asyncio.to_thread(outlook, candles, int(time.time() * 1000))
        except Exception as error:
            raise HTTPException(status_code=503, detail="Hourly forecast data is unavailable.") from error
        result = {"symbol": symbol, "method": METHOD, "forecasts": forecasts}
        # Bad/stale input can recover within this hour; do not cache transient failure.
        if all("evaluation" in forecast for forecast in forecasts):
            outlook_cache[symbol] = (hour, result)
        return result


@app.get("/api/prediction/{symbol}/history", response_model=PredictionHistoryResponse)
async def get_prediction_history(
    symbol: str,
    interval: str | None = Query(default=None),
    range: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=200),
):
    # History follows the same 15m locked-forecast track used in latest prediction.
    normalized_interval: Interval = "15m"
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
    range: str | None = Query(default=None),
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

    if interval or range:
        resolved_interval = runtime.resolve_interval(interval, range)
        if resolved_interval not in settings.tracked_intervals:
            await websocket.accept()
            await websocket.close(code=1008, reason="Unsupported interval")
            return
        interval_filter = resolved_interval

    await runtime.hub.connect(websocket, symbol_filter, interval_filter)
    # Send one immediate snapshot so the client UI can render instantly.
    snapshot = await runtime.build_snapshot_event(symbol_filter, interval_filter)
    if snapshot:
        try:
            await websocket.send_json(snapshot)
        except WebSocketDisconnect:
            await runtime.hub.disconnect(websocket)
            return
        except Exception:
            await runtime.hub.disconnect(websocket)
            return

    try:
        while True:
            # Keep the socket alive; we ignore inbound text payloads for now.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await runtime.hub.disconnect(websocket)
    except Exception:
        await runtime.hub.disconnect(websocket)
