"use client";

import { useEffect, useState } from "react";
import { getCoins, getMarketHistory } from "@/lib/api/client";
import { MARKET_WINDOWS, marketSnapshot, type MarketSnapshot, type MarketWindow } from "@/lib/markets";
import type { Coin } from "@/types/market";

export type MarketAsset = Coin & { snapshot: MarketSnapshot | null; error: string | null };

export function useMarketsData(reload: number, window: MarketWindow) {
  const [state, setState] = useState<{ window: MarketWindow; rows: MarketAsset[]; loading: boolean; error: string | null }>({ window, rows: [], loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    async function refresh() {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);
        const { coins } = await getCoins(signal);
        const rows = await Promise.all(coins.map(async coin => {
          try {
            // Coarser long-range samples keep each mini chart below 300 points.
            const config = MARKET_WINDOWS[window];
            const history = await getMarketHistory(coin.symbol, config.interval, config.limit, signal);
            return { ...coin, snapshot: marketSnapshot(history.candles, Date.now(), window, history.observedAt ?? undefined), error: null };
          } catch {
            return { ...coin, snapshot: null, error: "Price feed unavailable" };
          }
        }));
        if (active) setState({ window, rows, loading: false, error: null });
      } catch {
        if (active) setState(previous => ({
          window,
          rows: previous.rows.map(row => ({ ...row, snapshot: row.snapshot ? { ...row.snapshot, stale: true, change: null } : null })),
          loading: false, error: "We couldn’t reach the market feed.",
        }));
      } finally {
        // Schedule after completion so slow requests never overlap.
        if (active) timer = setTimeout(refresh, 25_000);
      }
    }
    void refresh();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [reload, window]);
  return { ...state, loading: state.loading || state.window !== window };
}
