"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { SkeletonCard } from "@/components/dashboard/skeleton-card";
import { formatNewsTimestamp } from "@/lib/utils";
import type { NewsItem } from "@/types/market";

const HOW_IT_WORKS_STEPS = [
  {
    title: "Historical Market Data",
    description:
      "We collect past candlestick data from Binance using REST APIs. This gives the system historical price and volume patterns to learn from.",
  },
  {
    title: "Model Training",
    description:
      "The backend processes this data into features such as returns, momentum, volatility, and volume changes, then trains a machine learning model to predict whether the next candle is likely to move up or down.",
  },
  {
    title: "Live Market Stream",
    description:
      "Once trained, the system listens to Binance WebSocket streams for live candle updates across selected coins and intervals.",
  },
  {
    title: "Real-Time Prediction",
    description:
      "As new market data arrives, the model runs inference and produces a live directional signal — UP or DOWN — together with a confidence score.",
  },
  {
    title: "Dashboard Visualization",
    description:
      "The frontend displays the latest chart, prediction, confidence, and recent history in a clean real-time dashboard.",
  },
];

const FEATURE_ITEMS = [
  {
    title: "Binance historical data ingestion",
    description:
      "The backend fetches candlestick history from Binance Spot REST `/api/v3/klines`, normalizes it into typed candles, and serves it through your own backend-facing history endpoint.",
  },
  {
    title: "Live market stream updates",
    description:
      "Live candle updates come from Binance combined WebSocket kline streams. The backend keeps rolling in-memory buffers per symbol and interval, then forwards frontend-ready events through `/ws/market`.",
  },
  {
    title: "Beginner-friendly ML baseline",
    description:
      "Predictions are generated with an offline-trained NumPy logistic regression baseline. It predicts whether the next candle is more likely to close higher or lower than the current candle, then turns that probability into an UP or DOWN signal.",
  },
  {
    title: "Feature engineering on price structure",
    description:
      "The training pipeline builds interpretable features from each candle window: 1/3/6-period returns, candle range, candle body percentage, upper and lower wick ratios, relative volume, and 12/24-period trend context.",
  },
  {
    title: "Range-aware monitoring",
    description:
      "The dashboard maps user-facing ranges to honest backend intervals: Live → 1m, 1 Day → 5m, 1 Week → 1h, 1 Month → 4h, and 1 Year → 1d.",
  },
  {
    title: "Confidence scoring for every signal",
    description:
      "Each prediction includes both a direction and a confidence score derived from the model probability, so the dashboard can show strength of conviction instead of a binary label alone.",
  },
  {
    title: "Interactive charting and watchlist context",
    description:
      "The monitoring view pairs the selected symbol’s candlestick chart with a multi-coin watchlist, recent prediction history, and current market stats for quick comparison.",
  },
  {
    title: "Backend-only external integrations",
    description:
      "The frontend never talks directly to Binance or third-party news APIs. All data flows through your own Python backend or Next.js proxy routes, which keeps the browser contract stable.",
  },
  {
    title: "Responsive monitoring UI",
    description:
      "The interface is optimized for scanning: clear range selection, compact stat cards, recent signal history, and an always-available tracked coin navigator that works without full-page scrolling.",
  },
];

type LatestNewsSectionProps = {
  marketNews: NewsItem[];
  cryptoNews: NewsItem[];
  techNews: NewsItem[];
  newsLoading: boolean;
  newsError: string | null;
  newsWarning: string | null;
};

const NEWS_PAGE_SIZE = 3;

function NewsRow({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: NewsItem[];
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / NEWS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * NEWS_PAGE_SIZE;
    return items.slice(start, start + NEWS_PAGE_SIZE);
  }, [currentPage, items]);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <p className="text-xs text-slate-400">
          Page {currentPage} of {totalPages}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No stories available"
            description={`No ${title.toLowerCase()} stories are currently available from the configured feed.`}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            {paginatedItems.map((item) => (
            <article
              key={`${title}-${item.id}`}
              className="flex h-full flex-col rounded-2xl border border-white/10 bg-slate-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-200/80">{item.source}</p>
                <p className="text-xs text-slate-500">{formatNewsTimestamp(item.publishedAt)}</p>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">{item.headline}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-300">{item.summary}</p>
              <a
                href={item.url}
                className="mt-5 inline-flex w-fit items-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
              >
                Read more
              </a>
            </article>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
              const active = pageNumber === currentPage;
              return (
                <button
                  key={`${title}-page-${pageNumber}`}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    active
                      ? "border-cyan-300/40 bg-cyan-400 text-slate-950"
                      : "border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works">
      <div className="glass-panel rounded-2xl p-5 md:p-6">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200/80">How It Works</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">From historical candles to live model signals</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Our platform combines historical market data, machine learning, and live streaming price updates to
            generate real-time crypto direction signals.
          </p>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <article key={step.title} className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Step {index + 1}</p>
              <h3 className="mt-2 text-base font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-8">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200/80">Features</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">A technical breakdown of the monitoring stack</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              This project combines Binance market data, an offline-trained NumPy model, backend streaming, and a
              responsive Next.js dashboard so each layer has a clear responsibility.
            </p>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {FEATURE_ITEMS.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-slate-900/55 p-4"
              >
                <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LatestNewsSection({
  marketNews,
  cryptoNews,
  techNews,
  newsLoading,
  newsError,
  newsWarning,
}: LatestNewsSectionProps) {
  const hasAnyItems = marketNews.length > 0 || cryptoNews.length > 0 || techNews.length > 0;

  return (
    <section id="latest-news">
      <div className="glass-panel rounded-2xl p-5 md:p-6">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200/80">News</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Market and technology stories</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Keep broader context beside crypto signals. The Market feed highlights finance and macro headlines,
            the Crypto feed focuses on digital-asset stories, and the Tech feed tracks technology developments
            that can influence sentiment and adoption.
          </p>
          {newsWarning ? (
            <p className="mt-3 rounded-lg border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {newsWarning}
            </p>
          ) : null}
        </div>

        {newsLoading ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <SkeletonCard className="h-60" />
            <SkeletonCard className="h-60" />
            <SkeletonCard className="h-60" />
          </div>
        ) : newsError ? (
          <div className="mt-6">
            <EmptyState title="News unavailable" description={newsError} />
          </div>
        ) : !hasAnyItems ? (
          <div className="mt-6">
            <EmptyState
              title="News unavailable"
              description="No recent English-language market or technology stories are available from the configured NewsData feed yet."
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <NewsRow
              title="Market"
              subtitle="Recent market-focused stories from the configured feed."
              items={marketNews}
            />
            <NewsRow
              title="Crypto"
              subtitle="Recent crypto-specific stories from the configured feed."
              items={cryptoNews}
            />
            <NewsRow
              title="Tech"
              subtitle="Recent technology stories from the configured feed."
              items={techNews}
            />
          </div>
        )}
      </div>
    </section>
  );
}
