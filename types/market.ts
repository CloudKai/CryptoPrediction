export type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export type ChartRange = "live" | "1d" | "1w" | "1mo" | "1y";

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
  forecastStartAt?: string;
  forecastEndAt?: string;
  actualDirection?: PredictionDirection | null;
  resolvedAt?: string | null;
};

export type PredictionHistoryEntry = {
  id: string;
  symbol: string;
  interval: Interval;
  direction: PredictionDirection;
  actualDirection?: PredictionDirection | null;
  confidence: number;
  createdAt: string;
  resolvedAt?: string | null;
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

export type NewsItem = {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  summary: string;
  url: string;
  imageUrl?: string | null;
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
  observedAt?: number | null;
};

export type PredictionResponse = {
  prediction: Prediction;
};

export type PredictionHistoryResponse = {
  symbol: string;
  interval: Interval;
  history: PredictionHistoryEntry[];
};

export type NewsResponse = {
  items: NewsItem[];
};

export type CryptoNewsProxyResponse =
  | {
      ok: true;
      source: "newsdata.io";
      status: number;
      syncedAt: string;
      refreshedFromUpstream: boolean;
      market: NewsItem[];
      crypto: NewsItem[];
      tech: NewsItem[];
      warning?: string;
    }
  | {
      ok: false;
      source: "newsdata.io";
      status: number;
      syncedAt: string;
      refreshedFromUpstream: boolean;
      market: NewsItem[];
      crypto: NewsItem[];
      tech: NewsItem[];
      error: string;
    };
