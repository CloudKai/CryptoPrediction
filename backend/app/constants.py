from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Interval = Literal["1m", "5m", "15m", "1h", "4h", "1d"]
ChartRange = Literal["live", "1d", "1w", "1mo", "1y"]
PredictionDirection = Literal["UP", "DOWN"]
ModelStatus = Literal["ONLINE", "SYNCING", "OFFLINE"]

SUPPORTED_INTERVALS: tuple[Interval, ...] = ("1m", "5m", "15m", "1h", "4h", "1d")
SUPPORTED_CHART_RANGES: tuple[ChartRange, ...] = ("live", "1d", "1w", "1mo", "1y")

INTERVAL_TO_SECONDS: dict[Interval, int] = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}


@dataclass(frozen=True)
class Coin:
    symbol: str
    base_asset: str
    quote_asset: str
    display_name: str


TRACKED_COINS: tuple[Coin, ...] = (
    Coin(symbol="BTCUSDT", base_asset="BTC", quote_asset="USDT", display_name="Bitcoin"),
    Coin(symbol="ETHUSDT", base_asset="ETH", quote_asset="USDT", display_name="Ethereum"),
    Coin(symbol="BNBUSDT", base_asset="BNB", quote_asset="USDT", display_name="BNB"),
    Coin(symbol="SOLUSDT", base_asset="SOL", quote_asset="USDT", display_name="Solana"),
    Coin(symbol="XRPUSDT", base_asset="XRP", quote_asset="USDT", display_name="XRP"),
    Coin(symbol="ADAUSDT", base_asset="ADA", quote_asset="USDT", display_name="Cardano"),
    Coin(symbol="DOGEUSDT", base_asset="DOGE", quote_asset="USDT", display_name="Dogecoin"),
    Coin(symbol="AVAXUSDT", base_asset="AVAX", quote_asset="USDT", display_name="Avalanche"),
    Coin(symbol="LINKUSDT", base_asset="LINK", quote_asset="USDT", display_name="Chainlink"),
    Coin(symbol="MATICUSDT", base_asset="MATIC", quote_asset="USDT", display_name="Polygon"),
)

DEFAULT_SYMBOL = TRACKED_COINS[0].symbol
DEFAULT_INTERVAL: Interval = "5m"
DEFAULT_CHART_RANGE: ChartRange = "live"

CHART_RANGE_TO_INTERVAL: dict[ChartRange, Interval] = {
    "live": "1m",
    "1d": "5m",
    "1w": "1h",
    "1mo": "4h",
    "1y": "1d",
}

CHART_RANGE_TO_HISTORY_LIMIT: dict[ChartRange, int] = {
    "live": 60,
    "1d": 288,
    "1w": 168,
    "1mo": 180,
    "1y": 365,
}
