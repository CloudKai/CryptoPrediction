"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

import type { Candle } from "@/types/market";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SkeletonCard } from "@/components/dashboard/skeleton-card";

type CandlestickChartPanelProps = {
  candles: Candle[];
  loading: boolean;
  error?: string | null;
};

function mapToCandleData(candles: Candle[]): CandlestickData<Time>[] {
  return candles.map((candle) => ({
    time: Math.floor(candle.time / 1000) as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

function mapToVolumeData(candles: Candle[]): HistogramData<Time>[] {
  return candles.map((candle) => ({
    time: Math.floor(candle.time / 1000) as UTCTimestamp,
    value: candle.volume,
    color: candle.close >= candle.open ? "rgba(16, 185, 129, 0.50)" : "rgba(244, 63, 94, 0.45)",
  }));
}

export function CandlestickChartPanel({ candles, loading, error }: CandlestickChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(148, 163, 184, 0.85)",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.08)" },
        horzLines: { color: "rgba(148, 163, 184, 0.08)" },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      crosshair: {
        vertLine: { color: "rgba(125, 211, 252, 0.5)" },
        horzLine: { color: "rgba(125, 211, 252, 0.5)" },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#fb7185",
      borderVisible: false,
      wickUpColor: "#34d399",
      wickDownColor: "#fb7185",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const observer = new ResizeObserver(() => {
      chart.timeScale().fitContent();
    });
    observer.observe(containerRef.current);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;
    candleSeriesRef.current.setData(mapToCandleData(candles));
    volumeSeriesRef.current.setData(mapToVolumeData(candles));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  if (loading) {
    return <SkeletonCard className="h-[420px]" />;
  }

  if (error) {
    return (
      <EmptyState
        title="Chart unavailable"
        description="Market history failed to load. Try changing symbols or refreshing the page."
      />
    );
  }

  if (candles.length === 0) {
    return (
      <EmptyState
        title="No candle data"
        description="There are no candles available for the selected symbol and interval."
      />
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-white">Candlestick Chart</h3>
        <p className="text-xs text-slate-400">
          Powered by TradingView Lightweight Charts. Data source is backend-facing API only.
        </p>
      </div>
      <div ref={containerRef} className="h-[380px] w-full" />
    </section>
  );
}
