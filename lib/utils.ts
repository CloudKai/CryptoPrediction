import { DEFAULT_INTERVAL, INTERVAL_TO_MS, SUPPORTED_INTERVALS } from "@/lib/constants";
import type { Interval } from "@/types/market";

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
