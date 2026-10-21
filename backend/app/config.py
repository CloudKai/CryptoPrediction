from __future__ import annotations

"""Environment-driven settings loader for backend runtime + training."""

import os
from dataclasses import dataclass
from pathlib import Path

from .constants import (
    DEFAULT_INTERVAL,
    DEFAULT_SYMBOL,
    SUPPORTED_INTERVALS,
    TRACKED_COINS,
    Interval,
)


def _to_int(name: str, default: int) -> int:
    """Parse integer env var, fallback safely if missing/invalid."""
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _to_float(name: str, default: float) -> float:
    """Parse float env var, fallback safely if missing/invalid."""
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _to_csv(name: str, fallback: list[str]) -> list[str]:
    """Parse comma-separated uppercase strings from env."""
    raw = os.getenv(name, "").strip()
    if not raw:
        return fallback
    values = [item.strip().upper() for item in raw.split(",") if item.strip()]
    return values or fallback


def _to_intervals(name: str, fallback: list[Interval]) -> list[Interval]:
    """Parse intervals and keep only supported values."""
    raw = os.getenv(name, "").strip()
    if not raw:
        return fallback
    result: list[Interval] = []
    for item in [part.strip() for part in raw.split(",") if part.strip()]:
        if item in SUPPORTED_INTERVALS:
            result.append(item)  # type: ignore[arg-type]
    return result or fallback


@dataclass(frozen=True)
class Settings:
    """Single source of config values used by the app."""

    binance_rest_base_url: str
    binance_ws_base_url: str
    tracked_symbols: list[str]
    tracked_intervals: list[Interval]
    bootstrap_candles_limit: int
    prediction_history_limit: int
    model_min_candles: int
    training_candles_limit: int
    training_min_samples: int
    training_epochs: int
    training_learning_rate: float
    training_l2: float
    artifacts_dir: Path
    default_symbol: str
    default_interval: Interval


def load_settings() -> Settings:
    """Build Settings with defaults + bounds to avoid unsafe runtime values."""
    default_symbols = [coin.symbol for coin in TRACKED_COINS]
    tracked_symbols = _to_csv("TRACKED_SYMBOLS", default_symbols)
    tracked_intervals = _to_intervals("TRACKED_INTERVALS", list(SUPPORTED_INTERVALS))
    artifacts_dir = Path(__file__).resolve().parents[1] / "artifacts"

    return Settings(
        binance_rest_base_url=os.getenv("BINANCE_REST_BASE_URL", "https://api.binance.com").strip()
        or "https://api.binance.com",
        binance_ws_base_url=os.getenv(
            "BINANCE_WS_BASE_URL",
            "wss://stream.binance.com:9443",
        ).strip()
        or "wss://stream.binance.com:9443",
        tracked_symbols=tracked_symbols,
        tracked_intervals=tracked_intervals,
        bootstrap_candles_limit=max(100, _to_int("BOOTSTRAP_CANDLES_LIMIT", 365)),
        prediction_history_limit=max(50, _to_int("PREDICTION_HISTORY_LIMIT", 200)),
        model_min_candles=max(50, _to_int("MODEL_MIN_CANDLES", 120)),
        training_candles_limit=max(400, _to_int("TRAINING_CANDLES_LIMIT", 1200)),
        training_min_samples=max(80, _to_int("TRAINING_MIN_SAMPLES", 250)),
        training_epochs=max(100, _to_int("TRAINING_EPOCHS", 600)),
        training_learning_rate=max(0.001, _to_float("TRAINING_LEARNING_RATE", 0.05)),
        training_l2=max(0.0, _to_float("TRAINING_L2", 0.002)),
        artifacts_dir=artifacts_dir,
        default_symbol=tracked_symbols[0] if tracked_symbols else DEFAULT_SYMBOL,
        default_interval=tracked_intervals[0] if tracked_intervals else DEFAULT_INTERVAL,
    )
