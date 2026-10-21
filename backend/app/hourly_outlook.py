"""Experimental direct hourly-return models with rolling-origin withholding.

Not the legacy 15m classifier. A horizon failing the checks returns NO estimates.
See docs/MARKETS_HOURLY_OUTLOOK.md for methodology and limitations.
"""
from __future__ import annotations

from datetime import UTC, datetime
import math

import numpy as np

from backend.app.schemas import Candle

HORIZONS = (1, 5, 10)
HOUR = 3_600_000
TRAIN = 720
CALIBRATION = 30
TEST = 40
LOOKBACK = 24
METHOD = "direct-ridge-hourly-v1"


def _features(log_prices: np.ndarray, index: int) -> np.ndarray:
    returns = np.diff(log_prices[index - LOOKBACK:index + 1])
    return np.array([log_prices[index] - log_prices[index - lag] for lag in (1, 3, 6, 12, 24)]
                    + [float(np.std(returns))], dtype=float)


def _fit_predict(log_prices: np.ndarray, features: np.ndarray, origin: int, hours: int) -> tuple[float, bool]:
    # Every training outcome is fully known AT the origin; no boundary leakage.
    indices = np.arange(max(LOOKBACK, origin - TRAIN), origin - hours + 1)
    X = features[indices]
    y = log_prices[indices + hours] - log_prices[indices]
    mean, std = X.mean(axis=0), X.std(axis=0)
    std = np.where(std < 1e-10, 1.0, std)
    X = np.column_stack([np.ones(len(X)), (X - mean) / std])
    penalty = np.eye(X.shape[1]) * 10.0
    penalty[0, 0] = 0
    weights = np.linalg.solve(X.T @ X + penalty, X.T @ y)
    latest = np.r_[1.0, (features[origin] - mean) / std]
    return float(latest @ weights), bool(np.mean(y > 0) >= 0.5)


def _stamp(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, UTC).isoformat()


def outlook(candles: list[Candle], now_ms: int) -> list[dict]:
    def unavailable(hours: int, reason: str, **extra) -> dict:
        return {"hours": hours, "status": "unavailable", "reason": reason, **extra}

    # Exclude the still-forming hour. Never fill missing bars or sort away defects.
    if any(c.time > now_ms for c in candles):
        return [unavailable(h, "The price feed contains future observations.") for h in HORIZONS]
    closed = [c for c in candles if c.time + HOUR <= now_ms]
    if (not closed or any(c.time < 0 or c.time % HOUR or not math.isfinite(c.close) or c.close <= 0
                          for c in closed)
            or any(b.time - a.time != HOUR for a, b in zip(closed, closed[1:]))):
        return [unavailable(h, "Complete, contiguous hourly prices are required.") for h in HORIZONS]
    if now_ms - (closed[-1].time + HOUR) >= HOUR:
        return [unavailable(h, "Hourly prices are stale. Refresh the market feed.") for h in HORIZONS]
    log_prices = np.log([c.close for c in closed])
    features = np.zeros((len(closed), 6))
    for index in range(LOOKBACK, len(closed)):
        features[index] = _features(log_prices, index)
    results = []
    for hours in HORIZONS:
        # Non-overlapping targets within each horizon, with an earlier calibration block.
        first = len(closed) - 1 - (CALIBRATION + TEST) * hours
        if first < TRAIN + LOOKBACK:
            results.append(unavailable(hours, "Not enough history for this horizon’s checks."))
            continue
        predictions, actuals, baselines = [], [], []
        try:
            for origin in range(first, len(closed) - hours, hours):
                predicted, baseline_up = _fit_predict(log_prices, features, origin, hours)
                predictions.append(predicted)
                actuals.append(float(log_prices[origin + hours] - log_prices[origin]))
                baselines.append(baseline_up)
            errors = np.array(actuals) - np.array(predictions)
            covered = []
            for i in range(CALIBRATION, CALIBRATION + TEST):
                # Radius available at that origin, using ONLY earlier resolved errors.
                radius = float(np.quantile(np.abs(errors[i - CALIBRATION:i]), 0.8, method="higher"))
                covered.append(abs(errors[i]) <= radius)
            predicted = np.array(predictions[CALIBRATION:])
            actual = np.array(actuals[CALIBRATION:])
            mae = float(np.mean(np.abs(actual - predicted)))
            baseline_mae = float(np.mean(np.abs(actual)))  # unchanged-price forecast
            accuracy = float(np.mean((predicted > 0) == (actual > 0)))
            baseline_accuracy = float(np.mean(np.array(baselines[CALIBRATION:]) == (actual > 0)))
            coverage = float(np.mean(covered))
            evaluation = {"origins": TEST, "directionAccuracy": accuracy,
                          "baselineAccuracy": baseline_accuracy, "mae": mae,
                          "baselineMae": baseline_mae, "coverage": coverage}
            # These are explicit engineering screens, not proof of market skill.
            if not (baseline_mae > 1e-10 and mae <= baseline_mae * 0.95
                    and accuracy >= 0.55 and accuracy >= baseline_accuracy + 0.05
                    and 0.70 <= coverage <= 0.95):
                results.append(unavailable(hours, "This horizon has not passed its historical checks.", evaluation=evaluation))
                continue
            estimate, _ = _fit_predict(log_prices, features, len(closed) - 1, hours)
            radius = float(np.quantile(np.abs(errors[-CALIBRATION:]), 0.8, method="higher"))
            if not math.isfinite(estimate + radius) or radius <= 0 or abs(estimate) + radius > 0.5:
                results.append(unavailable(hours, "The estimated range is unstable."))
                continue
            price = closed[-1].close
            reference = closed[-1].time + HOUR
            results.append({"hours": hours, "status": "available", "referenceAt": _stamp(reference),
                            "targetAt": _stamp(reference + hours * HOUR), "referencePrice": price,
                            "estimatedPrice": price * math.exp(estimate),
                            "lowerPrice": price * math.exp(estimate - radius),
                            "upperPrice": price * math.exp(estimate + radius),
                            "direction": "UP" if estimate > 0 else "DOWN", "evaluation": evaluation})
        except (ValueError, FloatingPointError, np.linalg.LinAlgError):
            results.append(unavailable(hours, "The hourly model could not be evaluated."))
    return results
