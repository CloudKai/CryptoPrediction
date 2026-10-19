import { describe, expect, test, vi } from "vitest";

import {
  formatPercent,
  formatRelativeTime,
  parseChartRange,
  parseInterval,
  toSymbolDisplay,
} from "@/lib/utils";

describe("lib/utils", () => {
  test("parseInterval falls back to the default interval for unsupported values", () => {
    expect(parseInterval("bogus")).toBe("5m");
    expect(parseInterval(null)).toBe("5m");
  });

  test("parseChartRange supports legacy query values", () => {
    expect(parseChartRange("1m")).toBe("live");
    expect(parseChartRange("4h")).toBe("1mo");
    expect(parseChartRange("all")).toBe("1y");
  });

  test("toSymbolDisplay formats tracked symbols for the UI", () => {
    expect(toSymbolDisplay("BTCUSDT")).toBe("BTC/USDT");
  });

  test("formatPercent keeps the sign prefix for positive and negative values", () => {
    expect(formatPercent(4.239, 1)).toBe("+4.2%");
    expect(formatPercent(-1.51, 1)).toBe("-1.5%");
  });

  test("formatRelativeTime returns a friendly minute label", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:10:00.000Z"));

    expect(formatRelativeTime("2026-04-21T12:07:00.000Z")).toBe("3m ago");

    vi.useRealTimers();
  });
});
