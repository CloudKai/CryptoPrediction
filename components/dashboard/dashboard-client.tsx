"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { CandlestickChartPanel } from "@/components/dashboard/candlestick-chart-panel";
import { CoinSelector } from "@/components/dashboard/coin-selector";
import { ConfidenceMeter } from "@/components/dashboard/confidence-meter";
import { EmptyState } from "@/components/dashboard/empty-state";
import { IntervalSelector } from "@/components/dashboard/interval-selector";
import { PredictionBadge } from "@/components/dashboard/prediction-badge";
import { PredictionHistoryTable } from "@/components/dashboard/prediction-history-table";
import { SkeletonCard } from "@/components/dashboard/skeleton-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { StreamStatus } from "@/components/dashboard/stream-status";
import { WatchlistTable } from "@/components/dashboard/watchlist-table";
import { Sidebar } from "@/components/layout/sidebar";
import { DEFAULT_SYMBOL, TRACKED_COINS } from "@/lib/constants";
import { getCoins } from "@/lib/api/client";
import { useMarketDashboard } from "@/hooks/use-market-dashboard";
import { useWatchlistData } from "@/hooks/use-watchlist-data";
import {
  cn,
  formatCompactNumber,
  formatPercent,
  formatPrice,
  formatTimestamp,
  toSymbolDisplay,
} from "@/lib/utils";
import type { Coin, Interval } from "@/types/market";

type DashboardClientProps = {
  symbol: string;
  interval: Interval;
};

export function DashboardClient({ symbol, interval }: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [coins, setCoins] = useState<Coin[]>(TRACKED_COINS);

  const { candles, prediction, history, loading, error, streamStatus, lastStreamEvent } =
    useMarketDashboard(symbol, interval);
  const watchlist = useWatchlistData(interval, lastStreamEvent);

  useEffect(() => {
    const controller = new AbortController();
    getCoins(controller.signal)
      .then((response) => setCoins(response.coins))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const selectedCoin = useMemo(
    () => coins.find((coin) => coin.symbol === symbol) ?? coins[0],
    [coins, symbol],
  );

  const latestCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2] ?? latestCandle;
  const candleChangePct = latestCandle
    ? ((latestCandle.close - previousCandle.close) / Math.max(previousCandle.close, 0.00001)) * 100
    : 0;

  const handleSymbolChange = (nextSymbol: string) => {
    router.push(`/dashboard/${nextSymbol}?interval=${interval}`);
  };

  const handleIntervalChange = (nextInterval: Interval) => {
    router.push(`${pathname}?interval=${nextInterval}`);
  };

  const modelTone =
    prediction?.modelStatus === "ONLINE"
      ? "text-emerald-200 bg-emerald-500/15 border-emerald-300/30"
      : prediction?.modelStatus === "SYNCING"
        ? "text-amber-200 bg-amber-500/15 border-amber-300/30"
        : "text-rose-200 bg-rose-500/15 border-rose-300/30";

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-6 lg:grid-cols-[260px_1fr] lg:px-6">
      <Sidebar
        coins={coins}
        selectedSymbol={symbol}
        streamStatus={streamStatus}
        onSelect={handleSymbolChange}
      />

      <main className="space-y-6">
        <header className="glass-panel rounded-2xl p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Live dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">
                {selectedCoin?.displayName ?? DEFAULT_SYMBOL} · {toSymbolDisplay(symbol)}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Historical candles from REST snapshots and live updates from backend stream.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StreamStatus status={streamStatus} />
              {prediction ? (
                <span className={cn("rounded-full border px-3 py-1 text-xs", modelTone)}>
                  Model {prediction.modelStatus}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <CoinSelector coins={coins} value={symbol} onChange={handleSymbolChange} />
            <IntervalSelector value={interval} onChange={handleIntervalChange} />
          </div>
        </header>

        {error ? (
          <EmptyState
            title="Dashboard data failed"
            description="Unable to load market snapshot from the API. Please refresh or retry with a different symbol."
          />
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading || !latestCandle || !prediction ? (
            <>
              <SkeletonCard className="h-28" />
              <SkeletonCard className="h-28" />
              <SkeletonCard className="h-28" />
              <SkeletonCard className="h-28" />
            </>
          ) : (
            <>
              <StatCard
                label="Latest price"
                value={<AnimatedNumber prefix="$" value={latestCandle.close} fractionDigits={3} />}
                hint={
                  <span className={candleChangePct >= 0 ? "text-emerald-300" : "text-rose-300"}>
                    {formatPercent(candleChangePct, 3)} from prior candle
                  </span>
                }
              />
              <StatCard
                label="Prediction"
                value={<PredictionBadge direction={prediction.direction} className="text-base" />}
                hint={`Updated ${formatTimestamp(prediction.updatedAt)}`}
              />
              <StatCard
                label="Confidence"
                value={<AnimatedNumber value={prediction.confidence} fractionDigits={1} suffix="%" />}
                hint={<ConfidenceMeter confidence={prediction.confidence} />}
              />
              <StatCard
                label="Current candle volume"
                value={<AnimatedNumber value={latestCandle.volume} fractionDigits={0} />}
                hint={`High ${formatPrice(latestCandle.high)} · Low ${formatPrice(latestCandle.low)}`}
              />
            </>
          )}
        </section>

        <CandlestickChartPanel candles={candles} loading={loading} error={error} />

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {watchlist.loading ? (
            <SkeletonCard className="h-[420px]" />
          ) : watchlist.error ? (
            <EmptyState title="Watchlist unavailable" description={watchlist.error} />
          ) : (
            <WatchlistTable
              rows={watchlist.rows}
              selectedSymbol={symbol}
              onSelect={handleSymbolChange}
            />
          )}

          {loading ? (
            <SkeletonCard className="h-[420px]" />
          ) : (
            <PredictionHistoryTable rows={history} />
          )}
        </section>

        <div className="glass-panel rounded-2xl p-4 text-xs text-slate-400">
          <p>
            Backend contract: <code>GET /api/coins</code>, <code>GET /api/market/:symbol/history</code>,{" "}
            <code>GET /api/prediction/:symbol</code>, <code>GET /api/prediction/:symbol/history</code>,
            and stream endpoint. This UI never talks to Binance directly.
          </p>
          <p className="mt-2">
            24h watchlist volume is displayed as compact notation:{" "}
            <span className="font-mono text-slate-200">
              {watchlist.rows[0] ? formatCompactNumber(watchlist.rows[0].volume24h) : "--"}
            </span>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
