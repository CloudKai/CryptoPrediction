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

export function useMarketDashboard(symbol: string, interval: Interval) {
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
            getMarketHistory(symbol, interval, 500, abortController.signal),
            getLatestPrediction(symbol, interval, abortController.signal),
            getPredictionHistory(symbol, interval, 25, abortController.signal),
          ]);

        setState({
          candles: historyResponse.candles,
          prediction: predictionResponse.prediction,
          history: predictionHistoryResponse.history,
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
  }, [symbol, interval]);

  const handleStreamEvent = useEffectEvent((event: MarketStreamEvent) => {
    if (event.symbol !== symbol || event.interval !== interval) return;

    setLastStreamEvent(event);
    setState((previousState) => {
      const nextCandles = [...previousState.candles];
      const latestCandle = nextCandles[nextCandles.length - 1];
      if (latestCandle && latestCandle.time === event.candle.time) {
        nextCandles[nextCandles.length - 1] = event.candle;
      } else {
        nextCandles.push(event.candle);
      }

      const boundedCandles = nextCandles.slice(-500);
      const nextHistoryEntry: PredictionHistoryEntry = {
        id: `${event.symbol}-${event.interval}-${event.candle.time}`,
        symbol: event.symbol,
        interval: event.interval,
        direction: event.prediction.direction,
        confidence: event.prediction.confidence,
        createdAt: event.prediction.updatedAt,
        price: event.prediction.price,
      };
      const dedupedHistory = [
        nextHistoryEntry,
        ...previousState.history.filter((entry) => entry.id !== nextHistoryEntry.id),
      ].slice(0, 25);

      return {
        candles: boundedCandles,
        prediction: event.prediction,
        history: dedupedHistory,
      };
    });
  });

  const handleStatus = useEffectEvent((status: StreamConnectionStatus) => {
    setStreamStatus(status);
  });

  useEffect(() => {
    const unsubscribe = adapterRef.current.subscribe(symbol, interval, {
      onEvent: handleStreamEvent,
      onStatus: handleStatus,
    });

    return () => {
      unsubscribe();
    };
  }, [symbol, interval]);

  return {
    ...state,
    loading,
    error,
    streamStatus,
    lastStreamEvent,
  };
}
