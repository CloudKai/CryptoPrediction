import type {
  CandleHistoryResponse,
  CoinsResponse,
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
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
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
) {
  return fetchJson<CandleHistoryResponse>(
    `/api/market/${encodeURIComponent(symbol)}/history?interval=${interval}&limit=${limit}`,
    signal,
  );
}

export function getLatestPrediction(symbol: string, interval: Interval, signal?: AbortSignal) {
  return fetchJson<PredictionResponse>(
    `/api/prediction/${encodeURIComponent(symbol)}?interval=${interval}`,
    signal,
  );
}

export function getPredictionHistory(
  symbol: string,
  interval: Interval,
  limit = 25,
  signal?: AbortSignal,
) {
  return fetchJson<PredictionHistoryResponse>(
    `/api/prediction/${encodeURIComponent(symbol)}/history?interval=${interval}&limit=${limit}`,
    signal,
  );
}
