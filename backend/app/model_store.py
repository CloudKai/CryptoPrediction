from __future__ import annotations

"""In-memory registry for loaded model artifacts."""

from pathlib import Path

import numpy as np

from backend.app.constants import Interval
from backend.app.modeling import load_artifact, predict_probability


class ModelStore:
    """Loads model JSON artifacts and serves prediction calls."""

    def __init__(self, artifacts_dir: Path):
        self._artifacts_dir = artifacts_dir
        self._models: dict[tuple[str, Interval], dict[str, object]] = {}

    def model_path(self, symbol: str, interval: Interval) -> Path:
        """Canonical path for one symbol+interval artifact."""
        return self._artifacts_dir / symbol / f"{interval}.json"

    def load(self, symbols: list[str], intervals: list[Interval]) -> None:
        """Load every available artifact into memory at startup."""
        self._models.clear()
        for symbol in symbols:
            for interval in intervals:
                path = self.model_path(symbol, interval)
                if not path.exists():
                    continue
                artifact = load_artifact(path)
                self._models[(symbol, interval)] = artifact

    def has_model(self, symbol: str, interval: Interval) -> bool:
        return (symbol, interval) in self._models

    def predict(self, symbol: str, interval: Interval, feature_vector: np.ndarray) -> float | None:
        """Return probability if model exists, otherwise None."""
        artifact = self._models.get((symbol, interval))
        if artifact is None:
            return None
        return predict_probability(feature_vector, artifact)

    def metadata(self, symbol: str, interval: Interval) -> dict[str, object] | None:
        return self._models.get((symbol, interval))
