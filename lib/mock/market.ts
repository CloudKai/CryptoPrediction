import {
  DEFAULT_SYMBOL,
  INTERVAL_TO_MS,
  TRACKED_COINS,
  WATCHLIST_INTERVAL,
} from "@/lib/constants";
import { clamp } from "@/lib/utils";
import type {
  Candle,
  Coin,
  Interval,
  MarketStreamEvent,
  Prediction,
  PredictionDirection,
  PredictionHistoryEntry,
  WatchlistRow,
} from "@/types/market";

const BASE_PRICE_BY_SYMBOL: Record<string, number> = {
  BTCUSDT: 68_200,
  ETHUSDT: 3_450,
  BNBUSDT: 615,
  SOLUSDT: 182,
  XRPUSDT: 0.62,
  ADAUSDT: 0.58,
  DOGEUSDT: 0.16,
  AVAXUSDT: 49,
  LINKUSDT: 18.4,
  MATICUSDT: 1.12,
};

const VOLUME_BY_SYMBOL: Record<string, number> = {
  BTCUSDT: 98_000,
  ETHUSDT: 165_000,
  BNBUSDT: 54_000,
  SOLUSDT: 135_000,
  XRPUSDT: 225_000,
  ADAUSDT: 198_000,
  DOGEUSDT: 340_000,
  AVAXUSDT: 104_000,
  LINKUSDT: 88_000,
  MATICUSDT: 210_000,
};

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seed: number) {
  let value = seed + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function rand(key: string) {
  return randomFromSeed(hashString(key));
}

function normalizeSymbol(rawSymbol: string) {
  const upper = rawSymbol.toUpperCase();
  return TRACKED_COINS.some((coin) => coin.symbol === upper) ? upper : DEFAULT_SYMBOL;
}

function alignTimestamp(timestamp: number, interval: Interval) {
  const unit = INTERVAL_TO_MS[interval];
  return Math.floor(timestamp / unit) * unit;
}

function buildCandles(
  symbol: string,
  interval: Interval,
  limit: number,
  endTimestamp: number,
): Candle[] {
  const normalizedSymbol = normalizeSymbol(symbol);
  const intervalMs = INTERVAL_TO_MS[interval];
  const alignedEnd = alignTimestamp(endTimestamp, interval);
  const candles: Candle[] = [];
  const basePrice = BASE_PRICE_BY_SYMBOL[normalizedSymbol] ?? BASE_PRICE_BY_SYMBOL[DEFAULT_SYMBOL];
  const symbolBias = (rand(`${normalizedSymbol}:bias`) - 0.5) * 0.0005;

  let openPrice = basePrice;
  for (let idx = 0; idx < limit; idx += 1) {
    const candleTime = alignedEnd - (limit - idx - 1) * intervalMs;
    const waveA = Math.sin(candleTime / (intervalMs * 9) + rand(`${normalizedSymbol}:waveA`) * 8) * 0.0022;
    const waveB = Math.sin(candleTime / (intervalMs * 31) + rand(`${normalizedSymbol}:waveB`) * 14) * 0.0012;
    const noise = (rand(`${normalizedSymbol}:${interval}:${candleTime}:noise`) - 0.5) * 0.0048;
    const changePct = waveA + waveB + noise + symbolBias;

    const closePrice = Math.max(0.00001, openPrice * (1 + changePct));
    const high = Math.max(openPrice, closePrice) * (1 + rand(`${candleTime}:high`) * 0.0032);
    const low = Math.min(openPrice, closePrice) * (1 - rand(`${candleTime}:low`) * 0.0032);
    const baseVolume = VOLUME_BY_SYMBOL[normalizedSymbol] ?? 90_000;
    const volumeShock =
      0.75 +
      rand(`${normalizedSymbol}:${interval}:${candleTime}:volume`) * 0.8 +
      Math.abs(changePct) * 120;
    const volume = baseVolume * volumeShock;

    candles.push({
      time: candleTime,
      open: openPrice,
      high,
      low,
      close: closePrice,
      volume,
    });

    openPrice = closePrice;
  }

  return candles;
}

function computePredictionFromCandles(
  symbol: string,
  interval: Interval,
  candles: Candle[],
  predictionTime: number,
): Prediction {
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2] ?? latest;
  const anchor = candles[Math.max(0, candles.length - 20)] ?? previous;

  const momentum = (latest.close - previous.close) / Math.max(previous.close, 0.00001);
  const trend = (latest.close - anchor.close) / Math.max(anchor.close, 0.00001);
  const modelWave =
    Math.sin(predictionTime / (INTERVAL_TO_MS[interval] * 7) + rand(`${symbol}:model`)) * 0.0018;
  const score = momentum * 0.52 + trend * 0.36 + modelWave * 0.12;
  const direction: PredictionDirection = score >= 0 ? "UP" : "DOWN";
  const confidence = clamp(52 + Math.abs(score) * 2900, 51, 94);

  const statusSelector = rand(`${symbol}:${Math.floor(predictionTime / 300_000)}:status`);
  const modelStatus = statusSelector > 0.09 ? "ONLINE" : "SYNCING";

  return {
    symbol,
    interval,
    direction,
    confidence,
    price: latest.close,
    updatedAt: new Date(predictionTime).toISOString(),
    modelStatus,
  };
}

export function getTrackedCoins(): Coin[] {
  return TRACKED_COINS;
}

export function getCandleHistory(
  symbol: string,
  interval: Interval,
  limit = 500,
  endTimestamp = Date.now(),
) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const safeLimit = clamp(Math.round(limit), 20, 2000);
  const candles = buildCandles(normalizedSymbol, interval, safeLimit, endTimestamp);

  return {
    symbol: normalizedSymbol,
    interval,
    candles,
  };
}

export function getLatestPrediction(symbol: string, interval: Interval) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const history = getCandleHistory(normalizedSymbol, interval, 120).candles;
  const now = alignTimestamp(Date.now(), interval) + INTERVAL_TO_MS[interval];
  const prediction = computePredictionFromCandles(normalizedSymbol, interval, history, now);

  return {
    prediction,
  };
}

export function getPredictionHistory(symbol: string, interval: Interval, limit = 20) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const safeLimit = clamp(Math.round(limit), 5, 100);
  const history: PredictionHistoryEntry[] = [];
  const intervalMs = INTERVAL_TO_MS[interval];
  const now = alignTimestamp(Date.now(), interval);

  for (let i = safeLimit - 1; i >= 0; i -= 1) {
    const targetTime = now - i * intervalMs;
    const candles = buildCandles(normalizedSymbol, interval, 60, targetTime);
    const prediction = computePredictionFromCandles(
      normalizedSymbol,
      interval,
      candles,
      targetTime + intervalMs,
    );

    history.push({
      id: `${normalizedSymbol}-${interval}-${targetTime}`,
      symbol: normalizedSymbol,
      interval,
      direction: prediction.direction,
      confidence: prediction.confidence,
      createdAt: prediction.updatedAt,
      price: prediction.price,
    });
  }

  return {
    symbol: normalizedSymbol,
    interval,
    history: history.reverse(),
  };
}

export function getWatchlistRows(interval: Interval = WATCHLIST_INTERVAL): WatchlistRow[] {
  return TRACKED_COINS.map((coin) => {
    const candles = getCandleHistory(coin.symbol, interval, 320).candles;
    const latest = candles[candles.length - 1];
    const oneDayAgo = candles[Math.max(0, candles.length - 288)];
    const change24h = ((latest.close - oneDayAgo.close) / oneDayAgo.close) * 100;
    const volume24h = candles.slice(-288).reduce((sum, candle) => sum + candle.volume, 0);
    const prediction = getLatestPrediction(coin.symbol, interval).prediction;

    return {
      symbol: coin.symbol,
      displayName: coin.displayName,
      price: latest.close,
      change24h,
      volume24h,
      direction: prediction.direction,
      confidence: prediction.confidence,
      updatedAt: prediction.updatedAt,
    };
  });
}

export function createLiveMarketEvent(symbol: string, interval: Interval): MarketStreamEvent {
  const normalizedSymbol = normalizeSymbol(symbol);
  const intervalMs = INTERVAL_TO_MS[interval];
  const now = Date.now();
  const currentCandleTime = alignTimestamp(now, interval);
  const latestHistory = buildCandles(normalizedSymbol, interval, 2, currentCandleTime - intervalMs);
  const lastClosed = latestHistory[latestHistory.length - 1];
  const progress = (now - currentCandleTime) / intervalMs;

  const intrabarWave =
    Math.sin(now / 8_000 + rand(`${normalizedSymbol}:live-wave`) * Math.PI * 2) * 0.0016;
  const microShock = (rand(`${normalizedSymbol}:${Math.floor(now / 2_000)}:live`) - 0.5) * 0.0009;
  const drift = (progress - 0.5) * 0.0006;

  const close = Math.max(0.00001, lastClosed.close * (1 + intrabarWave + microShock + drift));
  const high = Math.max(lastClosed.close, close) * (1 + 0.0008 + progress * 0.0016);
  const low = Math.min(lastClosed.close, close) * (1 - 0.0008 - progress * 0.0011);

  const candle: Candle = {
    time: currentCandleTime,
    open: lastClosed.close,
    high,
    low,
    close,
    volume:
      (VOLUME_BY_SYMBOL[normalizedSymbol] ?? 80_000) *
      (0.25 + progress * 0.9 + rand(`${normalizedSymbol}:${now}:vol`) * 0.2),
  };

  const direction: PredictionDirection = close >= candle.open ? "UP" : "DOWN";
  const confidence = clamp(53 + Math.abs((close - candle.open) / candle.open) * 14_000, 51, 92);
  const prediction: Prediction = {
    symbol: normalizedSymbol,
    interval,
    direction,
    confidence,
    price: close,
    updatedAt: new Date(now).toISOString(),
    modelStatus: "ONLINE",
  };

  return {
    type: "market_update",
    symbol: normalizedSymbol,
    interval,
    candle,
    prediction,
  };
}
