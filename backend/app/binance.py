from __future__ import annotations

"""Binance client helpers.

This module translates raw Binance REST/WS payloads into our internal Candle model.
"""

import asyncio
import json
from typing import Any

import httpx
import websockets

from .constants import INTERVAL_TO_SECONDS, Interval
from .schemas import Candle


def _kline_to_candle(kline: list[Any]) -> Candle:
    """Map Binance kline array format to typed Candle."""
    return Candle(
        time=int(kline[0]),
        open=float(kline[1]),
        high=float(kline[2]),
        low=float(kline[3]),
        close=float(kline[4]),
        volume=float(kline[5]),
    )


class BinanceClient:
    """Thin wrapper around Binance Spot REST and combined WebSocket streams."""

    def __init__(self, rest_base_url: str, ws_base_url: str):
        self.rest_base_url = rest_base_url.rstrip("/")
        self.ws_base_url = ws_base_url.rstrip("/")
        self._http = httpx.AsyncClient(timeout=20.0)

    async def close(self) -> None:
        await self._http.aclose()

    async def fetch_klines(self, symbol: str, interval: Interval, limit: int = 500) -> list[Candle]:
        """Fetch one page (up to 1000 rows) of kline history."""
        safe_limit = max(1, min(limit, 1000))
        response = await self._http.get(
            f"{self.rest_base_url}/api/v3/klines",
            params={
                "symbol": symbol.upper(),
                "interval": interval,
                "limit": safe_limit,
            },
        )
        response.raise_for_status()
        raw = response.json()
        if not isinstance(raw, list):
            return []
        return [_kline_to_candle(item) for item in raw if isinstance(item, list)]

    async def fetch_klines_paginated(
        self,
        symbol: str,
        interval: Interval,
        total_limit: int,
    ) -> list[Candle]:
        """Fetch larger history windows by paging backwards with endTime."""
        remaining = max(1, total_limit)
        all_rows: list[Candle] = []
        end_time_ms: int | None = None

        while remaining > 0:
            step = min(1000, remaining)
            params: dict[str, int | str] = {
                "symbol": symbol.upper(),
                "interval": interval,
                "limit": step,
            }
            if end_time_ms is not None:
                params["endTime"] = end_time_ms

            response = await self._http.get(f"{self.rest_base_url}/api/v3/klines", params=params)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, list) or not payload:
                break

            rows = [_kline_to_candle(item) for item in payload if isinstance(item, list)]
            rows.sort(key=lambda candle: candle.time)
            all_rows = rows + all_rows
            oldest_time = rows[0].time
            end_time_ms = oldest_time - 1
            remaining -= len(rows)
            if len(rows) < step:
                # No more history available.
                break

            await asyncio.sleep(0.02)

        dedup: dict[int, Candle] = {candle.time: candle for candle in all_rows}
        merged = sorted(dedup.values(), key=lambda candle: candle.time)
        return merged[-total_limit:]

    def build_combined_stream_url(self, symbols: list[str], intervals: list[Interval]) -> str:
        """Build one combined stream URL so we only keep one WS connection open."""
        streams: list[str] = []
        for symbol in symbols:
            lower_symbol = symbol.lower()
            for interval in intervals:
                streams.append(f"{lower_symbol}@kline_{interval}")
        return f"{self.ws_base_url}/stream?streams={'/'.join(streams)}"

    async def stream_klines(self, symbols: list[str], intervals: list[Interval]):
        """Yield normalized kline updates from Binance combined stream."""
        url = self.build_combined_stream_url(symbols, intervals)
        async for message in self._raw_stream(url):
            payload = json.loads(message)
            data = payload.get("data", payload)
            if not isinstance(data, dict):
                continue

            k = data.get("k")
            if not isinstance(k, dict):
                continue

            symbol = str(k.get("s", "")).upper()
            interval = str(k.get("i", ""))
            if interval not in INTERVAL_TO_SECONDS:
                continue

            candle = Candle(
                time=int(k.get("t", 0)),
                open=float(k.get("o", 0.0)),
                high=float(k.get("h", 0.0)),
                low=float(k.get("l", 0.0)),
                close=float(k.get("c", 0.0)),
                volume=float(k.get("v", 0.0)),
            )
            is_closed = bool(k.get("x", False))
            # is_closed=True means the candle is finalized.
            yield symbol, interval, candle, is_closed

    async def _raw_stream(self, url: str):
        """Raw async message generator with websocket keepalive settings."""
        async with websockets.connect(url, ping_interval=20, ping_timeout=20) as socket:
            async for message in socket:
                if isinstance(message, str):
                    yield message
