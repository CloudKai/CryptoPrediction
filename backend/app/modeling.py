from __future__ import annotations

"""Lightweight model utilities.

We implement logistic regression with NumPy so training/inference stay transparent
and avoid heavy ML dependencies for this portfolio project.
"""

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from backend.app.features import FEATURE_NAMES


@dataclass(frozen=True)
class TrainingResult:
    """Container for trained parameters and validation metrics."""

    weights: np.ndarray
    bias: float
    mean: np.ndarray
    std: np.ndarray
    metrics: dict[str, float]
    sample_count: int


def _sigmoid(values: np.ndarray) -> np.ndarray:
    """Numerically-stable sigmoid."""
    clipped = np.clip(values, -50, 50)
    return 1.0 / (1.0 + np.exp(-clipped))


def _standardize_fit(X: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Fit z-score stats and return normalized matrix."""
    mean = np.mean(X, axis=0)
    std = np.std(X, axis=0)
    std = np.where(std < 1e-8, 1.0, std)
    normalized = (X - mean) / std
    return normalized, mean, std


def _standardize_apply(X: np.ndarray, mean: np.ndarray, std: np.ndarray) -> np.ndarray:
    """Apply pre-fitted z-score stats."""
    safe_std = np.where(std < 1e-8, 1.0, std)
    return (X - mean) / safe_std


def train_logistic_regression(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_valid: np.ndarray,
    y_valid: np.ndarray,
    epochs: int,
    learning_rate: float,
    l2: float,
) -> TrainingResult:
    """Train binary logistic regression with gradient descent + L2 regularization."""
    X_train_scaled, mean, std = _standardize_fit(X_train)
    X_valid_scaled = _standardize_apply(X_valid, mean, std)

    n_features = X_train_scaled.shape[1]
    weights = np.zeros(n_features, dtype=np.float64)
    bias = 0.0

    y_train_float = y_train.astype(np.float64)
    for _ in range(epochs):
        # Forward pass: linear score -> probability.
        logits = np.dot(X_train_scaled, weights) + bias
        preds = _sigmoid(logits)
        errors = preds - y_train_float

        # Backward pass: gradients for weights and bias.
        grad_w = (np.dot(X_train_scaled.T, errors) / len(X_train_scaled)) + l2 * weights
        grad_b = float(np.mean(errors))

        # Parameter update step.
        weights -= learning_rate * grad_w
        bias -= learning_rate * grad_b

    valid_prob = _sigmoid(np.dot(X_valid_scaled, weights) + bias)
    valid_pred = (valid_prob >= 0.5).astype(np.int64)

    accuracy = float(np.mean(valid_pred == y_valid))
    tp = int(np.sum((valid_pred == 1) & (y_valid == 1)))
    fp = int(np.sum((valid_pred == 1) & (y_valid == 0)))
    fn = int(np.sum((valid_pred == 0) & (y_valid == 1)))
    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0

    return TrainingResult(
        weights=weights,
        bias=bias,
        mean=mean,
        std=std,
        metrics={
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
        },
        sample_count=int(len(X_train) + len(X_valid)),
    )


def predict_probability(feature_vector: np.ndarray, artifact: dict[str, object]) -> float:
    """Run inference using serialized artifact values."""
    weights = np.array(artifact["weights"], dtype=np.float64)
    mean = np.array(artifact["mean"], dtype=np.float64)
    std = np.array(artifact["std"], dtype=np.float64)
    bias = float(artifact["bias"])

    normalized = _standardize_apply(feature_vector.reshape(1, -1), mean, std)
    probability = float(_sigmoid(np.dot(normalized, weights) + bias)[0])
    return max(0.0, min(1.0, probability))


def to_artifact_payload(
    result: TrainingResult,
    symbol: str,
    interval: str,
) -> dict[str, object]:
    """Serialize training result to JSON-safe artifact format."""
    return {
        "model_type": "logistic_regression_numpy",
        "symbol": symbol,
        "interval": interval,
        "trained_at": datetime.now(UTC).isoformat(),
        "feature_names": list(FEATURE_NAMES),
        "weights": result.weights.tolist(),
        "bias": result.bias,
        "mean": result.mean.tolist(),
        "std": result.std.tolist(),
        "metrics": result.metrics,
        "sample_count": result.sample_count,
    }


def save_artifact(path: Path, payload: dict[str, object]) -> None:
    """Write one artifact file (creates parent directories automatically)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_artifact(path: Path) -> dict[str, object]:
    """Load and validate artifact shape at runtime."""
    raw = path.read_text(encoding="utf-8")
    payload = json.loads(raw)
    if not isinstance(payload, dict):
        raise ValueError("Invalid model artifact payload")
    return payload
