from __future__ import annotations

"""Pydantic models for API responses and stream payloads.

Field names intentionally match the existing Next.js frontend TypeScript types.
"""

from pydantic import BaseModel, Field

from backend.app.constants import Interval, ModelStatus, PredictionDirection


class Candle(BaseModel):
    time: int = Field(description="Open time in Unix milliseconds")
    open: float
    high: float
    low: float
    close: float
    volume: float


class CoinResponseItem(BaseModel):
    symbol: str
    baseAsset: str
    quoteAsset: str
    displayName: str


class CoinsResponse(BaseModel):
    coins: list[CoinResponseItem]


class Prediction(BaseModel):
    symbol: str
    interval: Interval
    direction: PredictionDirection
    confidence: float
    price: float
    updatedAt: str
    modelStatus: ModelStatus
    forecastStartAt: str | None = None
    forecastEndAt: str | None = None
    actualDirection: PredictionDirection | None = None
    resolvedAt: str | None = None


class PredictionResponse(BaseModel):
    prediction: Prediction


class PredictionHistoryEntry(BaseModel):
    id: str
    symbol: str
    interval: Interval
    direction: PredictionDirection
    actualDirection: PredictionDirection | None = None
    confidence: float
    createdAt: str
    resolvedAt: str | None = None
    price: float


class PredictionHistoryResponse(BaseModel):
    symbol: str
    interval: Interval
    history: list[PredictionHistoryEntry]


class CandleHistoryResponse(BaseModel):
    symbol: str
    interval: Interval
    candles: list[Candle]
    observedAt: int | None = None


class NewsItem(BaseModel):
    id: str
    headline: str
    source: str
    publishedAt: str
    summary: str
    url: str
    imageUrl: str | None = None


class NewsResponse(BaseModel):
    items: list[NewsItem]


class MarketStreamEvent(BaseModel):
    type: str = "market_update"
    symbol: str
    interval: Interval
    candle: Candle
    prediction: Prediction
