"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import {
  getLatestPrediction,
  getMarketHistory,
  getPredictionHistory,
} from "@/lib/api/client";
import { createMarketStreamAdapter } from "@/lib/stream/adapter";
import type {
  Candle,
  ChartRange,
  Interval,
  MarketStreamEvent,
  Prediction,
  PredictionHistoryEntry,
  StreamConnectionStatus,
} from "@/types/market";

type MarketDashboardState = {
  candles: Candle[];
  prediction: Prediction | null;
  history: PredictionHistoryEntry[];
};

const INITIAL_STATE: MarketDashboardState = {
  candles: [],
  prediction: null,
  history: [],
};

function sortAndDedupeCandles(candles: Candle[]) {
  const byTime = new Map<number, Candle>();
  for (const candle of candles) {
    byTime.set(candle.time, candle);
  }

  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}

function dedupePredictionHistory(entries: PredictionHistoryEntry[]) {
  const byId = new Map<string, PredictionHistoryEntry>();
  for (const entry of entries) {
    byId.set(entry.id, entry);
  }

  return Array.from(byId.values()).sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function useMarketDashboard(
  symbol: string,
  range: ChartRange,
  interval: Interval,
  historyLimit: number,
) {
  const predictionInterval: Interval = "15m";
  const [state, setState] = useState<MarketDashboardState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamConnectionStatus>("connecting");
  const [lastStreamEvent, setLastStreamEvent] = useState<MarketStreamEvent | null>(null);
  const adapterRef = useRef(createMarketStreamAdapter());

  useEffect(() => {
    const abortController = new AbortController();

    async function loadSnapshot() {
      setLoading(true);
      setError(null);

      try {
        const [historyResponse, predictionResponse, predictionHistoryResponse] =
          await Promise.all([
            getMarketHistory(symbol, interval, historyLimit, abortController.signal, range),
            getLatestPrediction(symbol, predictionInterval, abortController.signal, range),
            getPredictionHistory(symbol, predictionInterval, 100, abortController.signal, range),
          ]);

        setState({
          candles: historyResponse.candles,
          prediction: predictionResponse.prediction,
          history: dedupePredictionHistory(predictionHistoryResponse.history),
        });
      } catch (loadError) {
        if (!abortController.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load market data.");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSnapshot();

    return () => {
      abortController.abort();
    };
  }, [historyLimit, range, symbol, interval]);

  const handleStreamEvent = useEffectEvent((event: MarketStreamEvent) => {
    if (event.symbol !== symbol || event.interval !== interval) return;

    setLastStreamEvent(event);
    setState((previousState) => {
      const boundedCandles = sortAndDedupeCandles([
        ...previousState.candles,
        event.candle,
      ]).slice(-historyLimit);
      const forecastStart = event.prediction.forecastStartAt ?? event.prediction.updatedAt;
      const nextHistoryEntry: PredictionHistoryEntry = {
        id: `${event.symbol}-15m-${forecastStart}`,
        symbol: event.symbol,
        interval: "15m",
        direction: event.prediction.direction,
        actualDirection: event.prediction.actualDirection ?? null,
        confidence: event.prediction.confidence,
        createdAt: forecastStart,
        resolvedAt: event.prediction.resolvedAt ?? null,
        price: event.prediction.price,
      };
      const dedupedHistory = [
        nextHistoryEntry,
        ...previousState.history.filter((entry) => entry.id !== nextHistoryEntry.id),
      ];

      return {
        candles: boundedCandles,
        prediction: event.prediction,
        history: dedupePredictionHistory(dedupedHistory).slice(0, 100),
      };
    });
  });

  const handleStatus = useEffectEvent((status: StreamConnectionStatus) => {
    setStreamStatus(status);
  });

  useEffect(() => {
    const unsubscribe = adapterRef.current.subscribe(symbol, range, interval, {
      onEvent: handleStreamEvent,
      onStatus: handleStatus,
    });

    return () => {
      unsubscribe();
    };
  }, [range, symbol, interval]);

  return {
    ...state,
    loading,
    error,
    streamStatus,
    lastStreamEvent,
  };
}
