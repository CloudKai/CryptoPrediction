import {
  CHART_RANGE_OPTIONS,
  DEFAULT_CHART_RANGE,
  DEFAULT_INTERVAL,
  INTERVAL_TO_MS,
  SUPPORTED_INTERVALS,
} from "@/lib/constants";
import type { ChartRange, Interval } from "@/types/market";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function toSymbolDisplay(symbol: string) {
  return symbol.replace("USDT", "/USDT");
}

export function parseInterval(rawValue: string | null | undefined): Interval {
  if (!rawValue) return DEFAULT_INTERVAL;
  if (SUPPORTED_INTERVALS.includes(rawValue as Interval)) {
    return rawValue as Interval;
  }
  return DEFAULT_INTERVAL;
}

export function parseChartRange(rawValue: string | null | undefined): ChartRange {
  if (!rawValue) return DEFAULT_CHART_RANGE;

  const supportedRange = CHART_RANGE_OPTIONS.find((option) => option.value === rawValue);
  if (supportedRange) return supportedRange.value;

  // Backward compatibility for earlier links that used interval=... or range=all.
  if (rawValue === "all") return "1y";
  if (rawValue === "1m") return "live";
  if (rawValue === "5m") return "1d";
  if (rawValue === "15m") return "1w";
  if (rawValue === "1h") return "1w";
  if (rawValue === "4h") return "1mo";
  if (rawValue === "1d") return "1y";

  return DEFAULT_CHART_RANGE;
}

export function intervalToMs(interval: Interval) {
  return INTERVAL_TO_MS[interval];
}

export function formatPrice(value: number) {
  if (value > 999) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (value > 1) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  });
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`;
}

export function formatRelativeTime(input: string) {
  const timestamp = new Date(input).getTime();
  const delta = Date.now() - timestamp;

  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export function formatTimestamp(input: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "2-digit",
  }).format(new Date(input));
}

export function formatNewsTimestamp(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
