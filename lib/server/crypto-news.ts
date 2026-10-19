import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CryptoNewsProxyResponse, NewsItem } from "@/types/market";

const MARKET_URL = "https://newsdata.io/api/1/market";
const CRYPTO_URL = "https://newsdata.io/api/1/crypto";
const TECH_URL = "https://newsdata.io/api/1/latest";
const STORE_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(STORE_DIR, "news-cache.json");

const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 1;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

type CachedNews = {
  syncedAt: string;
  market: NewsItem[];
  crypto: NewsItem[];
  tech: NewsItem[];
};

type UpstreamFetchResult = {
  ok: boolean;
  status: number;
  items: NewsItem[];
};

let refreshPromise: Promise<{
  cached: CachedNews;
  refreshedFromUpstream: boolean;
  status: number;
  warning?: string;
}> | null = null;

function sanitizeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.replace(/\s+/g, " ").trim() || fallback;
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function toNewsItem(raw: Record<string, unknown>): NewsItem | null {
  const url = normalizeUrl(raw.link ?? raw.url);
  const headline = sanitizeText(raw.title);
  if (!url || !headline) return null;

  const id = sanitizeText(raw.article_id ?? raw.articleId ?? url, url);
  const source = sanitizeText(raw.source_name ?? raw.source_id ?? raw.source, "Unknown source");
  const publishedAt = sanitizeText(
    raw.pubDate ?? raw.publishedAt ?? raw.published_at,
    new Date().toISOString(),
  );
  const summary = sanitizeText(raw.description ?? raw.content, "Summary unavailable.");
  const imageUrl = normalizeUrl(raw.image_url ?? raw.imageUrl ?? raw.image);

  return {
    id,
    headline,
    source,
    publishedAt,
    summary,
    url,
    imageUrl,
  };
}

function dedupe(items: NewsItem[]) {
  const seen = new Set<string>();
  const unique: NewsItem[] = [];

  for (const item of items) {
    const key = `${item.id}|${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function extractResults(payload: Record<string, unknown>) {
  const candidates = [payload.results, payload.items, payload.news, payload.articles];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

async function ensureCacheFile() {
  await mkdir(STORE_DIR, { recursive: true });
  if (existsSync(STORE_FILE)) return;

  const seed: CachedNews = {
    syncedAt: new Date(0).toISOString(),
    market: [],
    crypto: [],
    tech: [],
  };
  await writeFile(STORE_FILE, JSON.stringify(seed, null, 2), "utf8");
}

async function readCache(): Promise<CachedNews> {
  await ensureCacheFile();
  const raw = await readFile(STORE_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw) as Partial<CachedNews>;
    return {
      syncedAt: typeof parsed.syncedAt === "string" ? parsed.syncedAt : new Date(0).toISOString(),
      market: Array.isArray(parsed.market) ? parsed.market : [],
      crypto: Array.isArray(parsed.crypto) ? parsed.crypto : [],
      tech: Array.isArray(parsed.tech) ? parsed.tech : [],
    };
  } catch {
    return {
      syncedAt: new Date(0).toISOString(),
      market: [],
      crypto: [],
      tech: [],
    };
  }
}

async function writeCache(cache: CachedNews) {
  await ensureCacheFile();
  await writeFile(STORE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

function shouldRefresh(cache: CachedNews) {
  const syncedAtMs = new Date(cache.syncedAt).getTime();
  if (Number.isNaN(syncedAtMs) || syncedAtMs === 0) return true;
  if (cache.market.length === 0 || cache.crypto.length === 0 || cache.tech.length === 0) return true;
  return Date.now() - syncedAtMs >= REFRESH_INTERVAL_MS;
}

async function fetchFromNewsData(
  url: string,
  params: URLSearchParams,
  apiKey: string,
): Promise<UpstreamFetchResult> {
  const requestUrl = new URL(url);
  requestUrl.search = params.toString();
  requestUrl.searchParams.set("apikey", apiKey);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(requestUrl, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 crypto-app",
        },
      });

      const rawBody = await response.text();
      if (!response.ok) {
        console.error("[news] upstream non-200", {
          url,
          status: response.status,
          body: rawBody.slice(0, 500),
        });
        if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
          continue;
        }
        return {
          ok: false,
          status: response.status,
          items: [],
        };
      }

      try {
        const payload = JSON.parse(rawBody) as Record<string, unknown>;
        const results = extractResults(payload);
        const normalized = dedupe(
          results
            .map((entry) =>
              entry && typeof entry === "object" ? toNewsItem(entry as Record<string, unknown>) : null,
            )
            .filter((entry): entry is NewsItem => entry !== null),
        );

        return {
          ok: true,
          status: response.status,
          items: normalized,
        };
      } catch {
        return {
          ok: false,
          status: 502,
          items: [],
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[news] request failed", { url, attempt, error: message });
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        continue;
      }
      return {
        ok: false,
        status: 502,
        items: [],
      };
    }
  }

  return {
    ok: false,
    status: 502,
    items: [],
  };
}

function buildMarketParams(limit: number) {
  const params = new URLSearchParams();
  params.set("q", "market");
  params.set("language", "en");
  params.set("sort", "pubdateasc");
  params.set("size", String(limit));
  return params;
}

function buildCryptoParams(limit: number) {
  const params = new URLSearchParams();
  params.set("prioritydomain", "top");
  params.set("domainurl", "coincodex.com");
  params.set("sort", "pubdateasc");
  params.set("size", String(limit));
  return params;
}

function buildTechParams(limit: number) {
  const params = new URLSearchParams();
  params.set("category", "technology");
  params.set("language", "en");
  params.set("size", String(limit));
  return params;
}

async function refreshCacheIfNeeded(current: CachedNews, limit: number) {
  const cacheTooSmall =
    current.market.length < limit || current.crypto.length < limit || current.tech.length < limit;

  if (!shouldRefresh(current) && !cacheTooSmall) {
    return {
      cached: {
        ...current,
        market: current.market.slice(0, limit),
        crypto: current.crypto.slice(0, limit),
        tech: current.tech.slice(0, limit),
      },
      refreshedFromUpstream: false,
      status: 200,
    };
  }

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) {
      return {
        cached: {
          ...current,
          market: current.market.slice(0, limit),
          crypto: current.crypto.slice(0, limit),
          tech: current.tech.slice(0, limit),
        },
        refreshedFromUpstream: false,
        status: 503,
        warning: "Missing NEWSDATA_API_KEY in .env.local",
      };
    }

    const [marketResult, cryptoResult, techResult] = await Promise.all([
      fetchFromNewsData(MARKET_URL, buildMarketParams(limit), apiKey),
      fetchFromNewsData(CRYPTO_URL, buildCryptoParams(limit), apiKey),
      fetchFromNewsData(TECH_URL, buildTechParams(limit), apiKey),
    ]);

    const nextMarket =
      marketResult.ok && marketResult.items.length > 0 ? marketResult.items : current.market;
    const nextCrypto =
      cryptoResult.ok && cryptoResult.items.length > 0 ? cryptoResult.items : current.crypto;
    const nextTech = techResult.ok && techResult.items.length > 0 ? techResult.items : current.tech;
    const nextCache: CachedNews = {
      syncedAt: new Date().toISOString(),
      market: dedupe(nextMarket).slice(0, limit),
      crypto: dedupe(nextCrypto).slice(0, limit),
      tech: dedupe(nextTech).slice(0, limit),
    };

    await writeCache(nextCache);

    const warnings: string[] = [];
    if ((!marketResult.ok || marketResult.items.length === 0) && nextCache.market.length === 0) {
      warnings.push("Market feed unavailable from upstream.");
    }
    if ((!cryptoResult.ok || cryptoResult.items.length === 0) && nextCache.crypto.length === 0) {
      warnings.push("Crypto feed unavailable from upstream.");
    }
    if ((!techResult.ok || techResult.items.length === 0) && nextCache.tech.length === 0) {
      warnings.push("Tech feed unavailable from upstream.");
    }

    return {
      cached: nextCache,
      refreshedFromUpstream: true,
      status: Math.max(marketResult.status, cryptoResult.status, techResult.status),
      warning: warnings.length > 0 ? warnings.join(" ") : undefined,
    };
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function fetchCryptoNews(limitPerSection: number): Promise<CryptoNewsProxyResponse> {
  const safeLimit = Math.min(Math.max(limitPerSection, 1), 10);
  const cached = await readCache();
  const refreshed = await refreshCacheIfNeeded(cached, safeLimit);

  const market = refreshed.cached.market.slice(0, safeLimit);
  const crypto = refreshed.cached.crypto.slice(0, safeLimit);
  const tech = refreshed.cached.tech.slice(0, safeLimit);
  const hasAnyItems = market.length > 0 || crypto.length > 0 || tech.length > 0;

  if (!hasAnyItems) {
    return {
      ok: false,
      source: "newsdata.io",
      status: Math.max(502, refreshed.status),
      syncedAt: refreshed.cached.syncedAt,
      refreshedFromUpstream: refreshed.refreshedFromUpstream,
      market,
      crypto,
      tech,
      error: refreshed.warning ?? "News unavailable from NewsData",
    };
  }

  return {
    ok: true,
    source: "newsdata.io",
    status: refreshed.status,
    syncedAt: refreshed.cached.syncedAt,
    refreshedFromUpstream: refreshed.refreshedFromUpstream,
    market,
    crypto,
    tech,
    warning: refreshed.warning,
  };
}
