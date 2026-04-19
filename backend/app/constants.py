from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Interval = Literal["1m", "5m", "15m"]
PredictionDirection = Literal["UP", "DOWN"]
ModelStatus = Literal["ONLINE", "SYNCING", "OFFLINE"]

SUPPORTED_INTERVALS: tuple[Interval, ...] = ("1m", "5m", "15m")

INTERVAL_TO_SECONDS: dict[Interval, int] = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
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

