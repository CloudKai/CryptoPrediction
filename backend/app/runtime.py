from __future__ import annotations

"""Runtime state and orchestration layer.

Responsibilities:
1) keep rolling candle buffers in memory
2) run model inference from latest candles
3) maintain prediction history
4) broadcast live events to connected WebSocket clients
"""

import asyncio
from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, WebSocket

from backend.app.binance import BinanceClient
from backend.app.config import Settings
from backend.app.constants import Interval, ModelStatus, PredictionDirection, TRACKED_COINS
from backend.app.features import build_latest_feature
from backend.app.model_store import ModelStore
from backend.app.schemas import (
    Candle,
    CoinResponseItem,
    Prediction,
    PredictionHistoryEntry,
)


@dataclass
class ConnectionFilter:
    """Represents one WS client and the optional stream filters it requested."""

    websocket: WebSocket
    symbol: str | None
    interval: Interval | None


class WebSocketHub:
    """Small connection manager used by /ws/market."""

    def __init__(self):
        self._connections: list[ConnectionFilter] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, symbol: str | None, interval: Interval | None) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.append(ConnectionFilter(websocket=websocket, symbol=symbol, interval=interval))

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections = [item for item in self._connections if item.websocket is not websocket]

    async def broadcast(self, payload: dict[str, Any]) -> None:
        # Copy the list under lock, then send outside lock to avoid blocking new connections.
        async with self._lock:
            targets = list(self._connections)

        to_remove: list[WebSocket] = []
        for target in targets:
            if target.symbol and payload.get("symbol") != target.symbol:
                continue
            if target.interval and payload.get("interval") != target.interval:
                continue

            try:
                await target.websocket.send_json(payload)
            except Exception:
                to_remove.append(target.websocket)

        if to_remove:
            async with self._lock:
                self._connections = [
                    item for item in self._connections if item.websocket not in set(to_remove)
                ]


class MarketRuntime:
    """Core application service.

    Think of this as the backend "engine" behind all API endpoints.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self.binance = BinanceClient(
            rest_base_url=settings.binance_rest_base_url,
            ws_base_url=settings.binance_ws_base_url,
        )
        self.model_store = ModelStore(settings.artifacts_dir)
        self.hub = WebSocketHub()

        self._candle_buffers: dict[tuple[str, Interval], deque[Candle]] = {}
        self._latest_predictions: dict[tuple[str, Interval], Prediction] = {}
        self._prediction_history: dict[tuple[str, Interval], deque[PredictionHistoryEntry]] = {}
        self._stream_task: asyncio.Task[None] | None = None
        self._connected_to_binance = False
        self._state_lock = asyncio.Lock()

    def _key(self, symbol: str, interval: Interval) -> tuple[str, Interval]:
        """Build a consistent dictionary key for symbol+interval state."""
        return (symbol.upper(), interval)

    def validate_symbol(self, symbol: str) -> str:
        upper = symbol.upper()
        if upper not in self.settings.tracked_symbols:
            raise HTTPException(status_code=404, detail=f"Unsupported symbol: {symbol}")
        return upper

    def validate_interval(self, interval: str | None) -> Interval:
        if interval is None:
            return self.settings.default_interval
        if interval not in self.settings.tracked_intervals:
            raise HTTPException(status_code=400, detail=f"Unsupported interval: {interval}")
        return interval

    async def startup(self) -> None:
        # Load already-trained artifacts before processing live data.
        self.model_store.load(self.settings.tracked_symbols, self.settings.tracked_intervals)
        # Prime caches so REST endpoints can answer immediately.
        await self._bootstrap_history()
        # Keep Binance stream running in background.
        self._stream_task = asyncio.create_task(self._run_stream_loop(), name="binance-stream-loop")

    async def shutdown(self) -> None:
        if self._stream_task:
            self._stream_task.cancel()
            try:
                await self._stream_task
            except asyncio.CancelledError:
                pass
        await self.binance.close()

    async def _bootstrap_history(self) -> None:
        """Fetch initial candle windows for every symbol+interval pair in parallel."""
        tasks: list[asyncio.Task[tuple[str, Interval, list[Candle]]]] = []

        async def fetch(symbol: str, interval: Interval):
            candles = await self.binance.fetch_klines(
                symbol=symbol,
                interval=interval,
                limit=self.settings.bootstrap_candles_limit,
            )
            return symbol, interval, candles

        for symbol in self.settings.tracked_symbols:
            for interval in self.settings.tracked_intervals:
                tasks.append(asyncio.create_task(fetch(symbol, interval)))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        async with self._state_lock:
            for result in results:
                if isinstance(result, Exception):
                    # Skip failures and continue bootstrapping other symbols.
                    continue
                symbol, interval, candles = result
                key = self._key(symbol, interval)
                self._candle_buffers[key] = deque(candles, maxlen=2500)
                self._prediction_history.setdefault(
                    key,
                    deque(maxlen=self.settings.prediction_history_limit),
                )
                self._refresh_prediction(symbol, interval, push_history=True)

    def _determine_status(self, symbol: str, interval: Interval, has_feature_vector: bool) -> ModelStatus:
        """Expose model readiness to frontend (ONLINE/SYNCING/OFFLINE)."""
        has_model = self.model_store.has_model(symbol, interval)
        if not has_model:
            return "OFFLINE"
        if not has_feature_vector:
            return "SYNCING"
        return "ONLINE" if self._connected_to_binance else "SYNCING"

    def _build_prediction_from_state(self, symbol: str, interval: Interval) -> Prediction:
        """Compute one prediction using current in-memory candle buffer."""
        key = self._key(symbol, interval)
        buffer = self._candle_buffers.get(key)
        if not buffer:
            raise HTTPException(status_code=503, detail="No market candles loaded yet")

        candles = list(buffer)
        latest = candles[-1]
        feature_vector = build_latest_feature(candles)
        status = self._determine_status(symbol, interval, feature_vector is not None)

        direction: PredictionDirection = "UP" if latest.close >= latest.open else "DOWN"
        confidence = 50.0

        if feature_vector is not None:
            probability = self.model_store.predict(symbol, interval, feature_vector)
            if probability is not None:
                # Convert probability to direction + confidence expected by frontend.
                direction = "UP" if probability >= 0.5 else "DOWN"
                confidence = max(probability, 1.0 - probability) * 100.0

        return Prediction(
            symbol=symbol,
            interval=interval,
            direction=direction,
            confidence=round(confidence, 4),
            price=latest.close,
            updatedAt=datetime.now(UTC).isoformat(),
            modelStatus=status,
        )

    def _refresh_prediction(self, symbol: str, interval: Interval, push_history: bool) -> Prediction:
        """Refresh latest prediction cache and optionally append history."""
        prediction = self._build_prediction_from_state(symbol, interval)
        key = self._key(symbol, interval)
        self._latest_predictions[key] = prediction

        if push_history:
            history = self._prediction_history.setdefault(
                key,
                deque(maxlen=self.settings.prediction_history_limit),
            )
            candle_time = self._candle_buffers[key][-1].time
            entry = PredictionHistoryEntry(
                id=f"{symbol}-{interval}-{candle_time}",
                symbol=symbol,
                interval=interval,
                direction=prediction.direction,
                confidence=prediction.confidence,
                createdAt=prediction.updatedAt,
                price=prediction.price,
            )
            if history and history[0].id == entry.id:
                # If the same candle ID already exists, overwrite it with fresher values.
                history[0] = entry
            else:
                history.appendleft(entry)

        return prediction

    async def ingest_candle_update(
        self,
        symbol: str,
        interval: Interval,
        candle: Candle,
        is_closed: bool,
    ) -> dict[str, Any] | None:
        """Apply one live Binance kline update and produce WS event payload."""
        if symbol not in self.settings.tracked_symbols or interval not in self.settings.tracked_intervals:
            return None

        async with self._state_lock:
            key = self._key(symbol, interval)
            buffer = self._candle_buffers.setdefault(key, deque(maxlen=2500))
            if buffer and buffer[-1].time == candle.time:
                # Same candle still forming: replace latest values.
                buffer[-1] = candle
            else:
                # New candle opened: append to rolling window.
                buffer.append(candle)

            prediction = self._refresh_prediction(symbol, interval, push_history=is_closed)
            event = {
                "type": "market_update",
                "symbol": symbol,
                "interval": interval,
                "candle": candle.model_dump(),
                "prediction": prediction.model_dump(),
            }
            return event

    async def _run_stream_loop(self) -> None:
        """Reconnectable Binance WS loop with exponential backoff."""
        backoff_seconds = 1
        while True:
            try:
                self._connected_to_binance = False
                async for symbol, interval_raw, candle, is_closed in self.binance.stream_klines(
                    self.settings.tracked_symbols,
                    self.settings.tracked_intervals,
                ):
                    if interval_raw not in self.settings.tracked_intervals:
                        continue
                    interval = interval_raw
                    self._connected_to_binance = True
                    event = await self.ingest_candle_update(symbol, interval, candle, is_closed)
                    if event:
                        await self.hub.broadcast(event)
                backoff_seconds = 1
            except asyncio.CancelledError:
                raise
            except Exception:
                # Network hiccups are normal with public streams; retry with backoff.
                self._connected_to_binance = False
                await asyncio.sleep(backoff_seconds)
                backoff_seconds = min(backoff_seconds * 2, 20)

    async def coins_response(self) -> list[CoinResponseItem]:
        """Return tracked coins in the frontend's expected shape."""
        all_coins = {coin.symbol: coin for coin in TRACKED_COINS}
        items: list[CoinResponseItem] = []
        for symbol in self.settings.tracked_symbols:
            coin = all_coins.get(symbol)
            if coin is None:
                items.append(
                    CoinResponseItem(
                        symbol=symbol,
                        baseAsset=symbol.replace("USDT", ""),
                        quoteAsset="USDT",
                        displayName=symbol.replace("USDT", ""),
                    )
                )
            else:
                items.append(
                    CoinResponseItem(
                        symbol=coin.symbol,
                        baseAsset=coin.base_asset,
                        quoteAsset=coin.quote_asset,
                        displayName=coin.display_name,
                    )
                )
        return items

    async def get_market_history(self, symbol: str, interval: Interval, limit: int) -> list[Candle]:
        """Serve historical candles from cache, fallback to Binance REST if needed."""
        symbol = self.validate_symbol(symbol)
        safe_limit = max(1, min(limit, 2000))
        key = self._key(symbol, interval)
        async with self._state_lock:
            candles = list(self._candle_buffers.get(key, []))
        if not candles:
            candles = await self.binance.fetch_klines(symbol=symbol, interval=interval, limit=safe_limit)
            async with self._state_lock:
                self._candle_buffers[key] = deque(candles, maxlen=2500)
        return candles[-safe_limit:]

    async def get_latest_prediction(self, symbol: str, interval: Interval) -> Prediction:
        """Return cached prediction, or compute one if missing."""
        symbol = self.validate_symbol(symbol)
        key = self._key(symbol, interval)
        async with self._state_lock:
            prediction = self._latest_predictions.get(key)
            if prediction:
                return prediction
            self._prediction_history.setdefault(key, deque(maxlen=self.settings.prediction_history_limit))
            prediction = self._refresh_prediction(symbol, interval, push_history=True)
            return prediction

    async def get_prediction_history(
        self,
        symbol: str,
        interval: Interval,
        limit: int,
    ) -> list[PredictionHistoryEntry]:
        """Return most recent prediction rows for a symbol+interval."""
        symbol = self.validate_symbol(symbol)
        safe_limit = max(1, min(limit, self.settings.prediction_history_limit))
        key = self._key(symbol, interval)
        async with self._state_lock:
            history = list(self._prediction_history.get(key, []))
            if history:
                return history[:safe_limit]

        # If no history yet, force one fresh prediction.
        await self.get_latest_prediction(symbol, interval)
        async with self._state_lock:
            history = list(self._prediction_history.get(key, []))
            return history[:safe_limit]

    async def build_snapshot_event(
        self,
        symbol_filter: str | None,
        interval_filter: Interval | None,
    ) -> dict[str, Any] | None:
        """Create one immediate WS snapshot event for newly connected clients."""
        async with self._state_lock:
            for (symbol, interval), candles in self._candle_buffers.items():
                if symbol_filter and symbol != symbol_filter:
                    continue
                if interval_filter and interval != interval_filter:
                    continue
                if not candles:
                    continue

                prediction = self._latest_predictions.get((symbol, interval))
                if prediction is None:
                    continue
                return {
                    "type": "market_update",
                    "symbol": symbol,
                    "interval": interval,
                    "candle": candles[-1].model_dump(),
                    "prediction": prediction.model_dump(),
                }
        return None
