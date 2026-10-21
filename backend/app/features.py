from __future__ import annotations

"""Feature engineering from candle windows.

These features are intentionally simple and interpretable for a beginner-friendly baseline.
"""

from dataclasses import dataclass

import numpy as np

from .schemas import Candle

FEATURE_NAMES: tuple[str, ...] = (
    "ret_1",
    "ret_3",
    "ret_6",
    "range_pct",
    "body_pct",
    "upper_wick_pct",
    "lower_wick_pct",
    "vol_rel_20",
    "trend_12",
    "trend_24",
)

LOOKBACK = 24


@dataclass(frozen=True)
class FeatureDataset:
    """Training matrix + binary labels."""

    X: np.ndarray
    y: np.ndarray


def _safe_div(a: float, b: float) -> float:
    if abs(b) < 1e-12:
        return 0.0
    return a / b


def _single_feature(candles: list[Candle], idx: int) -> np.ndarray:
    """Build one feature row at a specific candle index."""
    c = candles[idx]
    c1 = candles[idx - 1]
    c3 = candles[idx - 3]
    c6 = candles[idx - 6]
    c12 = candles[idx - 12]
    c24 = candles[idx - 24]

    candle_open = c.open
    candle_close = c.close
    candle_high = c.high
    candle_low = c.low

    ret_1 = _safe_div(candle_close - c1.close, c1.close)
    ret_3 = _safe_div(candle_close - c3.close, c3.close)
    ret_6 = _safe_div(candle_close - c6.close, c6.close)
    range_pct = _safe_div(candle_high - candle_low, candle_close)
    body_pct = _safe_div(candle_close - candle_open, candle_open)
    upper_wick = _safe_div(candle_high - max(candle_open, candle_close), candle_open)
    lower_wick = _safe_div(min(candle_open, candle_close) - candle_low, candle_open)
    vol_mean_20 = float(np.mean([item.volume for item in candles[idx - 19 : idx + 1]]))
    vol_rel_20 = _safe_div(c.volume, vol_mean_20)
    trend_12 = _safe_div(candle_close - c12.close, c12.close)
    trend_24 = _safe_div(candle_close - c24.close, c24.close)

    return np.array(
        [
            ret_1,
            ret_3,
            ret_6,
            range_pct,
            body_pct,
            upper_wick,
            lower_wick,
            vol_rel_20,
            trend_12,
            trend_24,
        ],
        dtype=np.float64,
    )


def build_training_dataset(candles: list[Candle]) -> FeatureDataset:
    """Build (X, y) where y=1 means next candle closes higher than current."""
    if len(candles) < LOOKBACK + 2:
        return FeatureDataset(X=np.zeros((0, len(FEATURE_NAMES))), y=np.zeros((0,), dtype=np.int64))

    features: list[np.ndarray] = []
    labels: list[int] = []
    for idx in range(LOOKBACK, len(candles) - 1):
        features.append(_single_feature(candles, idx))
        next_close = candles[idx + 1].close
        labels.append(1 if next_close > candles[idx].close else 0)

    return FeatureDataset(X=np.vstack(features), y=np.array(labels, dtype=np.int64))


def build_latest_feature(candles: list[Candle]) -> np.ndarray | None:
    """Build the most recent feature vector for live inference."""
    if len(candles) < LOOKBACK + 1:
        return None
    idx = len(candles) - 1
    return _single_feature(candles, idx)
