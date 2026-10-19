import type { ChartRange, Coin, Interval } from "@/types/market";

export const TRACKED_COINS: Coin[] = [
  {
    symbol: "BTCUSDT",
    baseAsset: "BTC",
    quoteAsset: "USDT",
    displayName: "Bitcoin",
  },
  {
    symbol: "ETHUSDT",
    baseAsset: "ETH",
    quoteAsset: "USDT",
    displayName: "Ethereum",
  },
  {
    symbol: "BNBUSDT",
    baseAsset: "BNB",
    quoteAsset: "USDT",
    displayName: "BNB",
  },
  {
    symbol: "SOLUSDT",
    baseAsset: "SOL",
    quoteAsset: "USDT",
    displayName: "Solana",
  },
  {
    symbol: "XRPUSDT",
    baseAsset: "XRP",
    quoteAsset: "USDT",
    displayName: "XRP",
  },
  {
    symbol: "ADAUSDT",
    baseAsset: "ADA",
    quoteAsset: "USDT",
    displayName: "Cardano",
  },
  {
    symbol: "DOGEUSDT",
    baseAsset: "DOGE",
    quoteAsset: "USDT",
    displayName: "Dogecoin",
  },
  {
    symbol: "AVAXUSDT",
    baseAsset: "AVAX",
    quoteAsset: "USDT",
    displayName: "Avalanche",
  },
  {
    symbol: "LINKUSDT",
    baseAsset: "LINK",
    quoteAsset: "USDT",
    displayName: "Chainlink",
  },
  {
    symbol: "MATICUSDT",
    baseAsset: "MATIC",
    quoteAsset: "USDT",
    displayName: "Polygon",
  },
];

export const SUPPORTED_INTERVALS: Interval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

export const CHART_RANGE_OPTIONS: Array<{ value: ChartRange; label: string }> = [
  { value: "live", label: "Live" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
  { value: "1mo", label: "1 Month" },
  { value: "1y", label: "1 Year" },
];

export const INTERVAL_TO_MS: Record<Interval, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export const DEFAULT_SYMBOL = TRACKED_COINS[0].symbol;
export const DEFAULT_INTERVAL: Interval = "5m";
export const DEFAULT_CHART_RANGE: ChartRange = "live";

export const WATCHLIST_INTERVAL: Interval = "5m";

export const CHART_RANGE_TO_CONFIG: Record<
  ChartRange,
  {
    interval: Interval;
    historyLimit: number;
  }
> = {
  live: {
    interval: "1m",
    historyLimit: 60,
  },
  "1d": {
    interval: "5m",
    historyLimit: 288,
  },
  "1w": {
    interval: "1h",
    historyLimit: 168,
  },
  "1mo": {
    interval: "4h",
    historyLimit: 180,
  },
  "1y": {
    interval: "1d",
    historyLimit: 365,
  },
};
