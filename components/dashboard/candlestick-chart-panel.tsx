"use client";

import { useEffect, useMemo, useState } from "react";

import { ConfidenceMeter } from "@/components/dashboard/confidence-meter";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PredictionBadge } from "@/components/dashboard/prediction-badge";
import { SkeletonCard } from "@/components/dashboard/skeleton-card";
import { formatPercent, formatPrice, formatTimestamp } from "@/lib/utils";
import type { Candle, Prediction } from "@/types/market";

type CandlestickChartPanelProps = {
  candles: Candle[];
  loading: boolean;
  error?: string | null;
  title?: string;
  headerAction?: React.ReactNode;
  latestCandle: Candle | null;
  previousCandle: Candle | null;
  prediction: Prediction | null;
};

type FallbackChartProps = {
  candles: Candle[];
  onSelectedCandleChange?: (candle: Candle | null) => void;
};

function sortCandlesAsc(candles: Candle[]) {
  return [...candles].sort((a, b) => a.time - b.time);
}

function formatAxisPrice(value: number) {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 10) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatCandleTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatVolume(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-900/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-slate-100">{value}</p>
    </div>
  );
}

function FallbackCandlestickChart({ candles, onSelectedCandleChange }: FallbackChartProps) {
  const width = 1000;
  const height = 380;
  const topPad = 18;
  const rightPad = 72;
  const leftPad = 18;
  const bottomPad = 22;
  const volumeHeight = 82;
  const plotHeight = height - topPad - bottomPad - volumeHeight;
  const plotWidth = width - leftPad - rightPad;
  const visibleCandles = useMemo(() => sortCandlesAsc(candles), [candles]);
  const [selectedIndex, setSelectedIndex] = useState(Math.max(visibleCandles.length - 1, 0));

  const low = Math.min(...visibleCandles.map((candle) => candle.low));
  const high = Math.max(...visibleCandles.map((candle) => candle.high));
  const maxVolume = Math.max(...visibleCandles.map((candle) => candle.volume), 1);
  const priceRange = Math.max(high - low, 1e-6);
  const stepX = plotWidth / Math.max(visibleCandles.length, 1);
  const candleBodyWidth = Math.max(3, stepX * 0.58);
  const safeSelectedIndex = Math.min(selectedIndex, Math.max(visibleCandles.length - 1, 0));
  const selectedCandle =
    visibleCandles[safeSelectedIndex] ?? visibleCandles[visibleCandles.length - 1] ?? null;

  useEffect(() => {
    onSelectedCandleChange?.(selectedCandle);
  }, [onSelectedCandleChange, selectedCandle]);

  const yForPrice = (value: number) => topPad + ((high - value) / priceRange) * (plotHeight - 8);
  const yForVolume = (value: number) =>
    topPad + plotHeight + 12 + (1 - value / maxVolume) * (volumeHeight - 18);

  const priceTicks = Array.from({ length: 5 }, (_, index) => high - (priceRange / 4) * index);
  const selectedX =
    selectedCandle == null ? leftPad : leftPad + stepX * safeSelectedIndex + stepX / 2;
  const selectedCloseY = selectedCandle == null ? topPad : yForPrice(selectedCandle.close);
  const sliderLeftInsetPercent = ((leftPad + stepX / 2) / width) * 100;
  const sliderRightInsetPercent = ((rightPad + stepX / 2) / width) * 100;

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-950/70 p-3">
      <div className="relative h-[380px] w-full overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950/70">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
          <rect x="0" y="0" width={width} height={height} fill="#020617" />

          {priceTicks.map((tick) => {
            const y = yForPrice(tick);
            return (
              <g key={tick}>
                <line
                  x1={leftPad}
                  y1={y}
                  x2={width - rightPad}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.12)"
                  strokeDasharray="4 8"
                />
                <text
                  x={width - rightPad + 10}
                  y={y + 4}
                  fill="rgba(148, 163, 184, 0.8)"
                  fontSize="12"
                  fontFamily="var(--font-jetbrains-mono), monospace"
                >
                  {formatAxisPrice(tick)}
                </text>
              </g>
            );
          })}

          {visibleCandles.map((candle, index) => {
            const centerX = leftPad + stepX * index + stepX / 2;
            const openY = yForPrice(candle.open);
            const closeY = yForPrice(candle.close);
            const highY = yForPrice(candle.high);
            const lowY = yForPrice(candle.low);
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(2, Math.abs(closeY - openY));
            const color = candle.close >= candle.open ? "#34d399" : "#fb7185";
            const volumeY = yForVolume(candle.volume);
            const volumeBarHeight = topPad + plotHeight + 12 + (volumeHeight - 18) - volumeY;

            return (
              <g key={candle.time}>
                <line
                  x1={centerX}
                  y1={highY}
                  x2={centerX}
                  y2={lowY}
                  stroke={color}
                  strokeWidth={index === safeSelectedIndex ? "2" : "1.5"}
                  strokeLinecap="round"
                />
                <rect
                  x={centerX - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  rx="1.5"
                  fill={color}
                  opacity={index === safeSelectedIndex ? 1 : 0.95}
                />
                <rect
                  x={centerX - candleBodyWidth / 2}
                  y={volumeY}
                  width={candleBodyWidth}
                  height={Math.max(2, volumeBarHeight)}
                  fill={
                    candle.close >= candle.open
                      ? "rgba(52, 211, 153, 0.35)"
                      : "rgba(251, 113, 133, 0.35)"
                  }
                />
              </g>
            );
          })}

          {selectedCandle ? (
            <g>
              <line
                x1={selectedX}
                y1={topPad}
                x2={selectedX}
                y2={topPad + plotHeight + volumeHeight + 12}
                stroke="rgba(34, 211, 238, 0.55)"
                strokeDasharray="5 6"
              />
              <circle
                cx={selectedX}
                cy={selectedCloseY}
                r="4"
                fill="#22d3ee"
                stroke="#020617"
                strokeWidth="2"
              />
            </g>
          ) : null}

          <line
            x1={leftPad}
            y1={topPad + plotHeight + 4}
            x2={width - rightPad}
            y2={topPad + plotHeight + 4}
            stroke="rgba(148, 163, 184, 0.18)"
          />
        </svg>

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>Live candlestick view</span>
          <span>{visibleCandles.length} candles</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>Time slider</span>
          <span>Drag to inspect any candle in view</span>
        </div>
        <div
          style={{
            marginLeft: `${sliderLeftInsetPercent}%`,
            marginRight: `${sliderRightInsetPercent}%`,
          }}
        >
          <input
            type="range"
            min={0}
            max={Math.max(visibleCandles.length - 1, 0)}
            step={1}
            value={safeSelectedIndex}
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-400"
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>{visibleCandles[0] ? formatCandleTimestamp(visibleCandles[0].time) : "--"}</span>
          <span>
            {visibleCandles[visibleCandles.length - 1]
              ? formatCandleTimestamp(visibleCandles[visibleCandles.length - 1].time)
              : "--"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CandlestickChartPanel({
  candles,
  loading,
  error,
  title,
  headerAction,
  latestCandle,
  previousCandle,
  prediction,
}: CandlestickChartPanelProps) {
  const [selectedCandleTime, setSelectedCandleTime] = useState<number | null>(
    latestCandle?.time ?? null,
  );

  if (loading) {
    return <SkeletonCard className="h-[420px]" />;
  }

  if (error) {
    return <EmptyState title="No data" description={error} />;
  }

  if (candles.length === 0 || !latestCandle) {
    return (
      <EmptyState
        title="No candle data"
        description="There are no candles available for the selected symbol and range."
      />
    );
  }

  const candleChangePercent =
    previousCandle && previousCandle.close > 0
      ? ((latestCandle.close - previousCandle.close) / previousCandle.close) * 100
      : 0;
  const selectedCandle =
    candles.find((candle) => candle.time === selectedCandleTime) ?? latestCandle;

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-white">{title ?? "Candlestick Chart"}</h3>
        {headerAction ? <div>{headerAction}</div> : null}
      </div>

      <FallbackCandlestickChart
        candles={candles}
        onSelectedCandleChange={(candle) => setSelectedCandleTime(candle?.time ?? null)}
      />

      <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Selected Candle</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <DetailCard
              label="Selected Time"
              value={selectedCandle ? formatCandleTimestamp(selectedCandle.time) : "--"}
            />
            <DetailCard
              label="Open"
              value={selectedCandle ? formatPrice(selectedCandle.open) : "--"}
            />
            <DetailCard
              label="High"
              value={selectedCandle ? formatPrice(selectedCandle.high) : "--"}
            />
            <DetailCard
              label="Low"
              value={selectedCandle ? formatPrice(selectedCandle.low) : "--"}
            />
            <DetailCard
              label="Close"
              value={selectedCandle ? formatPrice(selectedCandle.close) : "--"}
            />
            <DetailCard
              label="Volume"
              value={selectedCandle ? formatVolume(selectedCandle.volume) : "--"}
            />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Latest Price</p>
          <p className="mt-2 text-3xl font-semibold text-white">${formatPrice(latestCandle.close)}</p>
          <p className={`mt-2 text-sm ${candleChangePercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {formatPercent(candleChangePercent, 3)} from prior candle
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-400">Prediction (15 Minutes)</p>
          {prediction ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <PredictionBadge direction={prediction.direction} />
                <span className="text-xs text-slate-400">
                  Updated {formatTimestamp(prediction.updatedAt)}
                </span>
              </div>
              {prediction.actualDirection ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Actual</span>
                  <PredictionBadge direction={prediction.actualDirection} />
                  {prediction.resolvedAt ? (
                    <span className="text-xs text-slate-500">{formatTimestamp(prediction.resolvedAt)}</span>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Actual direction appears after candle close.</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Prediction unavailable.</p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Confidence</p>
          {prediction ? (
            <>
              <p className="mt-2 text-3xl font-semibold text-white">{prediction.confidence.toFixed(1)}%</p>
              <div className="mt-3">
                <ConfidenceMeter confidence={prediction.confidence} />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No confidence data.</p>
          )}

          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-400">Current Candle Volume</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatVolume(latestCandle.volume)}</p>
          <p className="mt-2 text-sm text-slate-300">High {formatPrice(latestCandle.high)}</p>
          <p className="text-sm text-slate-300">Low {formatPrice(latestCandle.low)}</p>
        </div>
      </div>
    </section>
  );
}
