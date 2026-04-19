export type Interval = "1m" | "5m" | "15m";

export type PredictionDirection = "UP" | "DOWN";

export type ModelStatus = "ONLINE" | "SYNCING" | "OFFLINE";

export type StreamConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export type Coin = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  displayName: string;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Prediction = {
  symbol: string;
  interval: Interval;
  direction: PredictionDirection;
  confidence: number;
  price: number;
  updatedAt: string;
  modelStatus: ModelStatus;
};

export type PredictionHistoryEntry = {
  id: string;
  symbol: string;
  interval: Interval;
  direction: PredictionDirection;
  confidence: number;
  createdAt: string;
  price: number;
};

export type WatchlistRow = {
  symbol: string;
  displayName: string;
  price: number;
  change24h: number;
  volume24h: number;
  direction: PredictionDirection;
  confidence: number;
  updatedAt: string;
};

export type MarketStreamEvent = {
  type: "market_update";
  symbol: string;
  interval: Interval;
  candle: Candle;
  prediction: Prediction;
};

export type CoinsResponse = {
  coins: Coin[];
};

export type CandleHistoryResponse = {
  symbol: string;
  interval: Interval;
  candles: Candle[];
};

export type PredictionResponse = {
  prediction: Prediction;
};

export type PredictionHistoryResponse = {
  symbol: string;
  interval: Interval;
  history: PredictionHistoryEntry[];
};
