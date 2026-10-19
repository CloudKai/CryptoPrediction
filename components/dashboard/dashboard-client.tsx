"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { CandlestickChartPanel } from "@/components/dashboard/candlestick-chart-panel";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { EmptyState } from "@/components/dashboard/empty-state";
import { IntervalSelector } from "@/components/dashboard/interval-selector";
import { PredictionHistoryTable } from "@/components/dashboard/prediction-history-table";
import { SkeletonCard } from "@/components/dashboard/skeleton-card";
import { WatchlistTable } from "@/components/dashboard/watchlist-table";
import { Sidebar } from "@/components/layout/sidebar";
import { useMarketDashboard } from "@/hooks/use-market-dashboard";
import { useWatchlistData } from "@/hooks/use-watchlist-data";
import { getCoins } from "@/lib/api/client";
import { CHART_RANGE_TO_CONFIG, TRACKED_COINS } from "@/lib/constants";
import {
  toSymbolDisplay,
} from "@/lib/utils";
import type { ChartRange, Coin } from "@/types/market";

type DashboardClientProps = {
  symbol: string;
  range: ChartRange;
  view?: "overview" | "monitor";
};

export function DashboardClient({
  symbol,
  range,
  view = "monitor",
}: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [coins, setCoins] = useState<Coin[]>(TRACKED_COINS);
  const [watchlistQuery, setWatchlistQuery] = useState("");
  const rangeConfig = CHART_RANGE_TO_CONFIG[range];
  const { candles, prediction, history, loading, error, lastStreamEvent } =
    useMarketDashboard(symbol, range, rangeConfig.interval, rangeConfig.historyLimit);
  const watchlist = useWatchlistData(rangeConfig.interval, lastStreamEvent);

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

  const latestCandle = candles[candles.length - 1] ?? null;
  const previousCandle = candles[candles.length - 2] ?? null;
  const filteredWatchlistRows = useMemo(() => {
    const normalizedQuery = watchlistQuery.trim().toLowerCase();
    if (!normalizedQuery) return watchlist.rows;

    return watchlist.rows.filter((row) => {
      const shortSymbol = row.symbol.replace("USDT", "").toLowerCase();
      const fullSymbol = row.symbol.toLowerCase();
      const displayName = row.displayName.toLowerCase();
      return (
        shortSymbol.includes(normalizedQuery) ||
        fullSymbol.includes(normalizedQuery) ||
        displayName.includes(normalizedQuery)
      );
    });
  }, [watchlist.rows, watchlistQuery]);

  const handleSymbolChange = (nextSymbol: string) => {
    router.push(`/dashboard/${nextSymbol}?range=${range}`, { scroll: false });
  };

  const handleIntervalChange = (nextRange: ChartRange) => {
    router.push(`${pathname}?range=${nextRange}`, { scroll: false });
  };

  const overviewHref =
    `/?range=${range}`;
  const monitorHref = `/dashboard/${symbol}?range=${range}`;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-75">
        <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-cyan-500/16 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[460px] w-[460px] rounded-full bg-blue-500/12 blur-[120px]" />
      </div>

      <DashboardTopBar
        activeTab={view === "overview" ? "overview" : "monitor"}
        overviewHref={overviewHref}
        monitorHref={monitorHref}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 lg:px-6">
        <section id="overview" className="scroll-mt-32">
          {view === "overview" ? (
            <main className="space-y-6">
              {error ? <EmptyState title="No data" description={error} /> : null}

              {watchlist.loading ? (
                <SkeletonCard className="h-[520px]" />
              ) : watchlist.error ? (
                <EmptyState title="No data" description={watchlist.error} />
              ) : (
                <WatchlistTable
                  rows={filteredWatchlistRows}
                  selectedSymbol={symbol}
                  onSelect={handleSymbolChange}
                  headerAction={
                    <label className="block">
                      <span className="sr-only">Search watchlist</span>
                      <input
                        type="text"
                        value={watchlistQuery}
                        onChange={(event) => setWatchlistQuery(event.target.value)}
                        placeholder="Search BTC, BNB, Bitcoin..."
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
                      />
                    </label>
                  }
                />
              )}
            </main>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <Sidebar
                coins={coins}
                selectedSymbol={symbol}
                onSelect={handleSymbolChange}
              />

              <main className="space-y-6">
                {error ? <EmptyState title="No data" description={error} /> : null}

                <CandlestickChartPanel
                  candles={candles}
                  loading={loading}
                  error={error}
                  title={`${selectedCoin?.displayName ?? symbol} · ${toSymbolDisplay(symbol)}`}
                  headerAction={<IntervalSelector value={range} onChange={handleIntervalChange} />}
                  latestCandle={latestCandle}
                  previousCandle={previousCandle}
                  prediction={prediction}
                />

                {loading ? (
                  <SkeletonCard className="h-[420px]" />
                ) : (
                  <PredictionHistoryTable rows={history} />
                )}
              </main>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
