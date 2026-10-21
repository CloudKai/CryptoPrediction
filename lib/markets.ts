import type { Candle, Interval } from "@/types/market";

export const MARKET_WINDOWS = {
  "24h": { label: "24H", description: "24 hours", hours: 24, interval: "5m", step: 300_000, limit: 290 },
  "7d": { label: "7D", description: "7 days", hours: 168, interval: "1h", step: 3_600_000, limit: 170 },
  "1mo": { label: "1M", description: "30 days", hours: 720, interval: "4h", step: 14_400_000, limit: 182 },
} as const satisfies Record<string, { label: string; description: string; hours: number; interval: Interval; step: number; limit: number }>;
export type MarketWindow = keyof typeof MARKET_WINDOWS;

export type PricePoint = { time: number; price: number };
export type MarketSnapshot = {
  window: MarketWindow;
  price: number;
  observedAt: number;
  stale: boolean;
  points: PricePoint[];
  change: number | null;
};

/** Candle closes are observed at interval END, except the current partial candle. */
export function marketSnapshot(candles: Candle[], receivedAt: number, window: MarketWindow, sourceObservedAt = receivedAt): MarketSnapshot {
  const config = MARKET_WINDOWS[window];
  if (!Number.isSafeInteger(sourceObservedAt) || sourceObservedAt > receivedAt + 60_000)
    throw new Error("The feed returned an invalid observation timestamp.");
  if (!candles.length || candles.some((c, i) =>
    !Number.isSafeInteger(c.time) || c.time < 0 || c.time % config.step !== 0 ||
    c.time > receivedAt || !Number.isFinite(c.close) || c.close <= 0 ||
    (i > 0 && c.time <= candles[i - 1].time))) {
    throw new Error("The price feed returned invalid observations.");
  }
  if (sourceObservedAt < candles[candles.length - 1].time)
    throw new Error("The observation timestamp precedes the latest candle.");
  const points = candles.map(c => ({ time: Math.min(c.time + config.step, sourceObservedAt), price: c.close }));
  const latest = points[points.length - 1];
  const stale = receivedAt - sourceObservedAt > 60_000 || receivedAt - latest.time > config.step * 2;
  const target = latest.time - config.hours * 3_600_000;
  const past = points.findLast(point => point.time <= target);
  const change = !stale && past && target - past.time < config.step
    ? (latest.price / past.price - 1) * 100 : null;
  return { window, price: latest.price, observedAt: latest.time, stale, points, change };
}

export function chartWindow(snapshot: MarketSnapshot) {
  const start = snapshot.observedAt - MARKET_WINDOWS[snapshot.window].hours * 3_600_000;
  const anchor = snapshot.points.findLast(point => point.time <= start);
  return snapshot.points.filter(point => point.time > start || point === anchor);
}
