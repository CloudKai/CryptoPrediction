"use client";

import { useEffect, useMemo, useState } from "react";

import { getCoins, getLatestPrediction, getMarketHistory } from "@/lib/api/client";
import { intervalToMs } from "@/lib/utils";
import type { Interval, MarketStreamEvent, WatchlistRow } from "@/types/market";

type WatchlistState = {
  rows: WatchlistRow[];
  loading: boolean;
  error: string | null;
};

const INITIAL_STATE: WatchlistState = {
  rows: [],
  loading: true,
  error: null,
};

export function useWatchlistData(interval: Interval, lastStreamEvent: MarketStreamEvent | null) {
  const [state, setState] = useState<WatchlistState>(INITIAL_STATE);
  const candlesPerDay = useMemo(
    () => Math.max(1, Math.ceil(86_400_000 / intervalToMs(interval))),
    [interval],
  );
  const candlesNeededForChange = useMemo(() => Math.max(2, candlesPerDay + 1), [candlesPerDay]);

  useEffect(() => {
    const abortController = new AbortController();
    let mounted = true;

    async function loadWatchlist() {
      if (!mounted) return;
      setState((previous) => ({
        ...previous,
        loading: true,
        error: null,
      }));

      try {
        const coinsResponse = await getCoins(abortController.signal);
        const rows = await Promise.all(
          coinsResponse.coins.map(async (coin) => {
            const [history, predictionResponse] = await Promise.all([
              getMarketHistory(coin.symbol, interval, candlesNeededForChange, abortController.signal),
              getLatestPrediction(coin.symbol, interval, abortController.signal),
            ]);

            const candles = history.candles;
            const latest = candles[candles.length - 1];
            const past = candles[0] ?? latest;
            const change24h = ((latest.close - past.close) / Math.max(past.close, 0.00001)) * 100;
            const volume24h = candles.slice(-candlesPerDay).reduce((sum, candle) => sum + candle.volume, 0);

            return {
              symbol: coin.symbol,
              displayName: coin.displayName,
              price: latest.close,
              change24h,
              volume24h,
              direction: predictionResponse.prediction.direction,
              confidence: predictionResponse.prediction.confidence,
              updatedAt: predictionResponse.prediction.updatedAt,
            } satisfies WatchlistRow;
          }),
        );

        if (mounted) {
          setState({
            rows,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!abortController.signal.aborted && mounted) {
          setState({
            rows: [],
            loading: false,
            error: error instanceof Error ? error.message : "Unable to load watchlist data.",
          });
        }
      }
    }

    loadWatchlist();
    const refreshInterval = window.setInterval(loadWatchlist, 25_000);

    return () => {
      mounted = false;
      abortController.abort();
      window.clearInterval(refreshInterval);
    };
  }, [candlesNeededForChange, candlesPerDay, interval]);

  const rows = useMemo(() => {
    if (!lastStreamEvent) return state.rows;

    return state.rows.map((row) => {
      if (row.symbol !== lastStreamEvent.symbol) return row;

      const basePrice = row.price > 0 ? row.price : lastStreamEvent.candle.open;
      const driftPct =
        ((lastStreamEvent.candle.close - basePrice) / Math.max(basePrice, 0.00001)) * 100;
      return {
        ...row,
        price: lastStreamEvent.candle.close,
        change24h: row.change24h + driftPct * 0.15,
        direction: lastStreamEvent.prediction.direction,
        confidence: lastStreamEvent.prediction.confidence,
        updatedAt: lastStreamEvent.prediction.updatedAt,
      };
    });
  }, [lastStreamEvent, state.rows]);

  return {
    ...state,
    rows,
  };
}
