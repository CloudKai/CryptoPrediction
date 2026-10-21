import asyncio
import os
from collections import deque
from datetime import UTC, datetime
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from backend.app.runtime import MarketRuntime
from backend.app.schemas import Candle


class MarketFreshnessTests(unittest.IsolatedAsyncioTestCase):
    async def test_function_prediction_refreshes_candles_before_reusing_instance_state(self):
        runtime = MarketRuntime.__new__(MarketRuntime)
        runtime.settings = SimpleNamespace(tracked_symbols=['BTCUSDT'], model_min_candles=120, prediction_history_limit=200)
        runtime._state_lock = asyncio.Lock()
        runtime._latest_predictions = {('BTCUSDT', '15m'): 'old-prediction'}
        runtime._prediction_history = {}
        runtime.get_market_history = AsyncMock()
        runtime._refresh_prediction = Mock(return_value='new-prediction')
        with patch.dict(os.environ, {'VERCEL': '1'}):
            result = await runtime.get_latest_prediction('BTCUSDT', '15m')
        self.assertEqual(result, 'new-prediction')
        runtime.get_market_history.assert_awaited_once_with('BTCUSDT', '15m', 120)
        runtime._refresh_prediction.assert_called_once()

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
