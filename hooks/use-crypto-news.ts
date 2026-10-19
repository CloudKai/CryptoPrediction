"use client";

import { useEffect, useState } from "react";

import { getLatestNews } from "@/lib/api/client";
import type { NewsItem } from "@/types/market";

type UseCryptoNewsResult = {
  market: NewsItem[];
  crypto: NewsItem[];
  tech: NewsItem[];
  loading: boolean;
  error: string | null;
  warning: string | null;
};

const NEWS_CACHE_TTL_MS = 30_000;

let cachedMarket: NewsItem[] | null = null;
let cachedCrypto: NewsItem[] | null = null;
let cachedTech: NewsItem[] | null = null;
let cachedError: string | null = null;
let cachedWarning: string | null = null;
let cachedAt = 0;
let cachedLimit = 0;
let inflightRequest: Promise<UseCryptoNewsResult> | null = null;

async function loadCryptoNews(limit: number): Promise<UseCryptoNewsResult> {
  const now = Date.now();
  if (
    cachedMarket &&
    cachedCrypto &&
    cachedTech &&
    now - cachedAt < NEWS_CACHE_TTL_MS &&
    cachedLimit >= limit
  ) {
    return {
      market: cachedMarket.slice(0, limit),
      crypto: cachedCrypto.slice(0, limit),
      tech: cachedTech.slice(0, limit),
      loading: false,
      error: cachedError,
      warning: cachedWarning,
    };
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  // Module-level promise caching helps avoid duplicate dev-mode requests from
  // React Strict Mode remounts and hot reloads.
  inflightRequest = (async () => {
    try {
      const response = await getLatestNews(limit);

      const result: UseCryptoNewsResult = response.ok
        ? {
            market: response.market,
            crypto: response.crypto,
            tech: response.tech,
            loading: false,
            error: null,
            warning: response.warning ?? null,
          }
        : {
            market: response.market,
            crypto: response.crypto,
            tech: response.tech,
            loading: false,
            error: response.error,
            warning: null,
          };

      cachedMarket = result.market;
      cachedCrypto = result.crypto;
      cachedTech = result.tech;
      cachedError = result.error;
      cachedWarning = result.warning;
      cachedLimit = limit;
      cachedAt = Date.now();
      return result;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

export function useCryptoNews(limit = 10): UseCryptoNewsResult {
  const [market, setMarket] = useState<NewsItem[]>([]);
  const [crypto, setCrypto] = useState<NewsItem[]>([]);
  const [tech, setTech] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadNews() {
      setLoading(true);
      setError(null);

      try {
        const response = await loadCryptoNews(limit);
        if (!active) return;
        setMarket(response.market);
        setCrypto(response.crypto);
        setTech(response.tech);
        setError(response.error);
        setWarning(response.warning);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "News unavailable.");
        setWarning(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadNews();

    return () => {
      active = false;
    };
  }, [limit]);

  return {
    market,
    crypto,
    tech,
    loading,
    error,
    warning,
  };
}
