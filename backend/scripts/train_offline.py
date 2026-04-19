from __future__ import annotations

"""Offline model training CLI.

Run this before starting the API if you want real model artifacts instead of OFFLINE status.
"""

import argparse
import asyncio
import json
from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np

from backend.app.binance import BinanceClient
from backend.app.config import Settings, load_settings
from backend.app.constants import Interval
from backend.app.features import build_training_dataset
from backend.app.modeling import save_artifact, to_artifact_payload, train_logistic_regression


@dataclass(frozen=True)
class TrainJob:
    """One training task for a specific symbol+interval pair."""

    symbol: str
    interval: Interval


async def train_single_job(client: BinanceClient, settings: Settings, job: TrainJob) -> dict[str, object]:
    """Fetch history, build features, train model, save artifact, return summary."""
    candles = await client.fetch_klines_paginated(
        symbol=job.symbol,
        interval=job.interval,
        total_limit=settings.training_candles_limit,
    )
    dataset = build_training_dataset(candles)
    if len(dataset.y) < settings.training_min_samples:
        raise ValueError(
            f"{job.symbol} {job.interval}: insufficient samples ({len(dataset.y)} < {settings.training_min_samples})"
        )

    split = max(int(len(dataset.y) * 0.8), 1)
    split = min(split, len(dataset.y) - 1)
    X_train, y_train = dataset.X[:split], dataset.y[:split]
    X_valid, y_valid = dataset.X[split:], dataset.y[split:]

    result = train_logistic_regression(
        X_train=X_train,
        y_train=y_train,
        X_valid=X_valid,
        y_valid=y_valid,
        epochs=settings.training_epochs,
        learning_rate=settings.training_learning_rate,
        l2=settings.training_l2,
    )

    artifact = to_artifact_payload(result=result, symbol=job.symbol, interval=job.interval)
    path = settings.artifacts_dir / job.symbol / f"{job.interval}.json"
    save_artifact(path=path, payload=artifact)

    metrics = artifact.get("metrics", {})
    return {
        "symbol": job.symbol,
        "interval": job.interval,
        "samples": result.sample_count,
        "artifact_path": str(path),
        "accuracy": metrics.get("accuracy", 0.0),
        "precision": metrics.get("precision", 0.0),
        "recall": metrics.get("recall", 0.0),
    }


async def train_all(settings: Settings, symbols: list[str] | None, intervals: list[Interval] | None):
    """Train all requested jobs sequentially and write a training report."""
    target_symbols = symbols if symbols else settings.tracked_symbols
    target_intervals = intervals if intervals else settings.tracked_intervals
    jobs = [TrainJob(symbol=symbol, interval=interval) for symbol in target_symbols for interval in target_intervals]

    client = BinanceClient(
        rest_base_url=settings.binance_rest_base_url,
        ws_base_url=settings.binance_ws_base_url,
    )
    try:
        results: list[dict[str, object]] = []
        for job in jobs:
            summary = await train_single_job(client, settings, job)
            results.append(summary)
            print(
                f"[trained] {job.symbol} {job.interval} "
                f"acc={summary['accuracy']:.4f} samples={summary['samples']} "
                f"path={summary['artifact_path']}"
            )

        report = {
            "trained_at": datetime.now(UTC).isoformat(),
            "symbols": target_symbols,
            "intervals": target_intervals,
            "count": len(results),
            "results": results,
            "mean_accuracy": float(np.mean([float(item["accuracy"]) for item in results])) if results else 0.0,
        }
        report_path = settings.artifacts_dir / "training_report.json"
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"[done] wrote report: {report_path}")
    finally:
        await client.close()


def parse_args(settings: Settings):
    """Parse optional symbol/interval overrides from CLI arguments."""
    parser = argparse.ArgumentParser(description="Train offline prediction models from Binance klines.")
    parser.add_argument(
        "--symbols",
        type=str,
        default="",
        help="Comma-separated symbols (default: use TRACKED_SYMBOLS).",
    )
    parser.add_argument(
        "--intervals",
        type=str,
        default="",
        help="Comma-separated intervals from 1m,5m,15m (default: use TRACKED_INTERVALS).",
    )
    args = parser.parse_args()

    symbols = [item.strip().upper() for item in args.symbols.split(",") if item.strip()] or None
    intervals_raw = [item.strip() for item in args.intervals.split(",") if item.strip()]
    intervals = [item for item in intervals_raw if item in settings.tracked_intervals] or None
    return symbols, intervals


def main():
    """CLI entrypoint."""
    settings = load_settings()
    symbols, intervals = parse_args(settings)
    asyncio.run(train_all(settings, symbols, intervals))


if __name__ == "__main__":
    main()
