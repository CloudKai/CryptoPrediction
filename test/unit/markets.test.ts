import { describe, expect, it } from "vitest";
import { chartWindow, MARKET_WINDOWS, marketSnapshot, type MarketWindow } from "@/lib/markets";
import type { Candle } from "@/types/market";

function fixture(window: MarketWindow) {
  const config = MARKET_WINDOWS[window];
  const candles: Candle[] = Array.from({ length: config.limit }, (_, i) => ({
    time: i * config.step, open: 100 + i, high: 101 + i, low: 99 + i, close: 100 + i, volume: 1,
  }));
  return { candles, now: config.limit * config.step, config };
}

describe("Markets balanced price windows", () => {
  it.each(["24h", "7d", "1mo"] as const)("uses a complete %s history and the correct anchor", window => {
    const { candles, now, config } = fixture(window);
    const snapshot = marketSnapshot(candles, now, window);
    const steps = config.hours * 3_600_000 / config.step;
    const latest = 100 + candles.length - 1;
    const past = latest - steps;
    expect(snapshot.price).toBe(latest);
    expect(snapshot.change).toBeCloseTo((latest / past - 1) * 100);
    expect(chartWindow(snapshot)).toHaveLength(steps + 1);
    expect(snapshot.window).toBe(window);
  });
  it("uses the actual observation time of a forming candle", () => {
    const { candles, now, config } = fixture("24h");
    const partialTime = now - config.step / 2;
    const snapshot = marketSnapshot(candles, partialTime, "24h");
    expect(snapshot.observedAt).toBe(partialTime);
    expect(snapshot.change).toBeCloseTo((389 / 100 - 1) * 100);
  });
  it("does not make a past change from missing or stale anchors", () => {
    const { candles, now, config } = fixture("24h");
    expect(marketSnapshot(candles.slice(-3), now, "24h").change).toBeNull();
    expect(marketSnapshot(candles, now + config.step * 3, "24h").change).toBeNull();
    expect(marketSnapshot(candles.filter(c => c.time !== config.step), now, "24h").change).toBeNull();
  });
  it("rejects invalid, future, unordered, duplicate, and wrong-resolution data", () => {
    const { candles, now, config } = fixture("24h");
    for (const rows of [[], [...candles].reverse(), [candles[0], candles[0]], [{ ...candles[0], close: NaN }], [{ ...candles[0], time: now + config.step }]]) {
      expect(() => marketSnapshot(rows, now, "24h")).toThrow();
    }
    expect(() => marketSnapshot(candles, now, "1mo")).toThrow();
  });
  it("does not assign a fresh timestamp to cached partial candles", () => {
    const { candles, now, config } = fixture("24h");
    const observed = now - config.step / 2;
    const snapshot = marketSnapshot(candles, now, "24h", observed);
    expect(snapshot.observedAt).toBe(observed);
    expect(snapshot.stale).toBe(true);
    expect(snapshot.change).toBeNull();
  });
});
