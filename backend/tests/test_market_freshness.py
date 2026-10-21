import asyncio
from collections import deque
from datetime import UTC, datetime
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock

from backend.app.runtime import MarketRuntime
from backend.app.schemas import Candle


class MarketFreshnessTests(unittest.IsolatedAsyncioTestCase):
    async def test_recent_candle_is_refetched_when_stream_stops_updating(self):
        now = int(datetime.now(UTC).timestamp() * 1000)
        candle = Candle(time=now // 300000 * 300000, open=100, high=100, low=100, close=100, volume=1)
        updated = candle.model_copy(update={'close': 105})
        runtime = MarketRuntime.__new__(MarketRuntime)
        runtime.settings = SimpleNamespace(tracked_symbols=['BTCUSDT'])
        runtime._state_lock = asyncio.Lock()
        runtime._candle_buffers = {('BTCUSDT', '5m'): deque([candle])}
        runtime._candle_received_at = {('BTCUSDT', '5m'): now - 20000}
        runtime.binance = SimpleNamespace(fetch_klines_paginated=AsyncMock(return_value=[updated]))
        rows = await runtime.get_market_history('BTCUSDT', '5m', 1)
        self.assertEqual(rows[-1].close, 105)
        runtime.binance.fetch_klines_paginated.assert_awaited_once()
        self.assertGreater(runtime.market_observed_at('BTCUSDT', '5m'), now - 1000)
        # An immediate second read reuses the freshly received observation.
        await runtime.get_market_history('BTCUSDT', '5m', 1)
        runtime.binance.fetch_klines_paginated.assert_awaited_once()


if __name__ == '__main__':
    unittest.main()
