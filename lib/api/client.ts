import type {
  CandleHistoryResponse,
  ChartRange,
  CoinsResponse,
  CryptoNewsProxyResponse,
  Interval,
  PredictionHistoryResponse,
  PredictionResponse,
} from "@/types/market";

async function fetchJson<T>(input: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(input, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const rawBody = await response.text();

    try {
      const parsed = JSON.parse(rawBody) as { message?: string; error?: string; detail?: string };
      throw new Error(parsed.message || parsed.error || parsed.detail || `Request failed: ${response.status}`);
    } catch {
      throw new Error(rawBody || `Request failed: ${response.status}`);
    }
  }

  return (await response.json()) as T;
}

export function getCoins(signal?: AbortSignal) {
  return fetchJson<CoinsResponse>("/api/coins", signal);
}

export function getMarketHistory(
  symbol: string,
  interval: Interval,
  limit = 500,
  signal?: AbortSignal,
  range?: ChartRange,
) {
  return fetchJson<CandleHistoryResponse>(
    `/api/market/${encodeURIComponent(symbol)}/history?interval=${interval}&limit=${limit}${range ? `&range=${range}` : ""}`,
    signal,
  );
}

export function getLatestPrediction(
  symbol: string,
  interval: Interval,
  signal?: AbortSignal,
  range?: ChartRange,
) {
  return fetchJson<PredictionResponse>(
    `/api/prediction/${encodeURIComponent(symbol)}?interval=${interval}${range ? `&range=${range}` : ""}`,
    signal,
  );
}

export function getPredictionHistory(
  symbol: string,
  interval: Interval,
  limit = 25,
  signal?: AbortSignal,
  range?: ChartRange,
) {
  return fetchJson<PredictionHistoryResponse>(
    `/api/prediction/${encodeURIComponent(symbol)}/history?interval=${interval}&limit=${limit}${range ? `&range=${range}` : ""}`,
    signal,
  );
}

export async function getLatestNews(limit = 10, signal?: AbortSignal) {
  const response = await fetch(`/api/crypto-news?limit=${limit}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const rawBody = await response.text();

  try {
    return JSON.parse(rawBody) as CryptoNewsProxyResponse;
  } catch {
    return {
      ok: false,
      source: "newsdata.io",
      status: response.status || 502,
      syncedAt: new Date().toISOString(),
      refreshedFromUpstream: false,
      market: [],
      crypto: [],
      tech: [],
      error: rawBody || "Invalid response from local crypto news proxy",
    } satisfies CryptoNewsProxyResponse;
  }
}
