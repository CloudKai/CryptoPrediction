import { correlation, newsEvidence } from "./market-structure";
import { AnalysisError } from "./errors";
import { issue } from "@/lib/discover/contract";
export const CATALOG = [
  { assetId: "bitcoin", name: "Bitcoin", symbol: "BTC", documentation: "https://bitcoin.org/en/how-it-works" },
  { assetId: "ethereum", name: "Ethereum", symbol: "ETH", documentation: "https://ethereum.org/developers/docs/intro-to-ethereum/" },
  { assetId: "solana", name: "Solana", symbol: "SOL", documentation: "https://solana.com/docs" },
] as const;
export type CryptoCandidate = { assetId: string; name: string; symbol: string; documentation?: string; candidateReason?: string };
export type ResearchEvidence = {
  id: string;
  assetId: string;
  title: string;
  url: string;
  observedAt: string;
  facts: Record<string, unknown>;
};
export async function cryptoJson(url: string, signal?: AbortSignal) {
  const key = process.env.COINGECKO_DEMO_API_KEY;
  const response = await fetch(url, { headers: key ? { "x-cg-demo-api-key": key } : {}, signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(15000)]), cache: "no-store", redirect: "error" });
  if (!response.ok)
    throw new AnalysisError(issue("market_data_unavailable", "Current market data could not be retrieved. Please try again shortly.", true));
  const text = await response.text();
  if (text.length > 2000000)
    throw new Error("Market response exceeds limit.");
  return JSON.parse(text);
}
export async function loadMarketHistory(assetId: string, days: number, signal?: AbortSignal): Promise<[
  number,
  number
][]> {
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(assetId) || !Number.isInteger(days) || days < 1 || days > 10000)
    throw new Error("Unsupported asset history.");
  const raw = await cryptoJson(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(assetId)}/market_chart?vs_currency=usd&days=${days}&interval=daily`, signal);
  if (!Array.isArray(raw.prices) || !raw.prices.length || raw.prices.some((row: unknown) => !Array.isArray(row) || row.length !== 2 || !row.every(Number.isFinite) || row[1] <= 0))
    throw new Error("Invalid daily price history.");
  const today = Math.floor(Date.now() / 86400000) * 86400000;
  const closed: [
    number,
    number
  ][] = raw.prices.filter(([time]: [
    number,
    number
  ]) => time < today);
  if (!closed.length || closed.some(([time], index) => !Number.isSafeInteger(time) || time < 0 || time % 86400000 !== 0 || (index > 0 && time - closed[index - 1][0] !== 86400000))) {
    throw new Error("Daily history must be ordered, unique and contiguous UTC closes.");
  }
  if (raw.prices.some(([time]: [
    number,
    number
  ]) => time > Date.now() + 60000))
    throw new Error("Daily history contains future observations.");
  return closed;
}
export function marketMetrics(prices: number[]) {
  if (prices.length < 250 || prices.some(price => !Number.isFinite(price) || price <= 0))
    throw new Error("Insufficient price history for risk metrics.");
  const returns = prices.slice(1).map((price, i) => Math.log(price) - Math.log(prices[i]));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const annualizedVolatility = Math.sqrt(returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1) * 365);
  let peak = prices[0], maxDrawdown = 0;
  for (const price of prices) {
    peak = Math.max(peak, price);
    maxDrawdown = Math.min(maxDrawdown, price / peak - 1);
  }
  return { annualizedLogVolatility: annualizedVolatility, maxDrawdown, observations: prices.length, returnConvention: "daily log returns, sample variance, sqrt(365) annualization" };
}
async function primaryDocumentation(asset: CryptoCandidate, now: number, signal?: AbortSignal): Promise<ResearchEvidence | null> {
  if (!asset.documentation) return null;
  try {
    const response = await fetch(asset.documentation, { signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(8000)]), cache: "no-store", redirect: "error" });
    if (!response.ok) return null;
    const html = await response.text();
    if (html.length > 3000000) return null;
    const excerpt = html.replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0,5000);
    if (excerpt.length < 200) return null;
    return { id: `${asset.assetId}:docs`, assetId: asset.assetId, title: `${asset.name} primary documentation (retrieved, not publication date)`, url: asset.documentation, observedAt: new Date(now).toISOString(), facts: { untrustedExcerpt: excerpt } };
  } catch {
    signal?.throwIfAborted();
    return null;
  }
}

export async function collectEvidence(signal?: AbortSignal, options: {requireDocumentation: boolean; candidates?: CryptoCandidate[]; snapshots?: unknown; partial?: boolean} = { requireDocumentation: true }): Promise<ResearchEvidence[]> {
  const now = Date.now();
  const candidates: readonly CryptoCandidate[] = options.candidates ?? CATALOG;
  const market = options.snapshots ?? await cryptoJson(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${candidates.map(asset => encodeURIComponent(asset.assetId)).join(",")}`, signal);
  if (!Array.isArray(market))
    throw new Error("Market evidence unavailable.");
  const histories = new Map<string, [
    number,
    number
  ][]>();
  const groups = await Promise.all(candidates.map(async (asset) => {
    try {
    const snapshot = market.find(row => row.id === asset.assetId);
    if (!snapshot || ![snapshot.current_price, snapshot.total_volume, snapshot.market_cap].every(value => Number.isFinite(value) && value > 0) || !Number.isFinite(Date.parse(snapshot.last_updated)) || now - Date.parse(snapshot.last_updated) > 900000 || Date.parse(snapshot.last_updated) > now + 60000)
      throw new Error("Stale or missing market evidence.");
    // Independent sources run together: optional enrichment must not consume
    // its full timeout before the next source or model request can start.
    const [history, news, documentation] = await Promise.all([
      loadMarketHistory(asset.assetId, 365, signal),
      // Enrichment is bounded to the curated projects; wider screening uses
      // measured markets, not guessed project URLs or extra news calls.
      asset.documentation ? newsEvidence(asset, signal) : Promise.resolve([]),
      primaryDocumentation(asset, now, signal),
    ]);
    const closed = history.filter(([time]) => time < Math.floor(now / 86400000) * 86400000);
    if (!closed.length || now - closed[closed.length - 1][0] > 2 * 86400000)
      throw new Error("Daily market evidence is stale.");
    const metrics = marketMetrics(closed.map(row => row[1]));
    histories.set(asset.assetId, closed);
    if (!documentation && options.requireDocumentation)
      throw new Error("Primary documentation unavailable.");
    return [
      ...news,
      { id: `${asset.assetId}:market`, assetId: asset.assetId, title: `CoinGecko ${asset.name} USD market data`, url: `https://www.coingecko.com/en/coins/${asset.assetId}`, observedAt: snapshot.last_updated, facts: { candidateReason: asset.candidateReason ?? "Curated research coverage", priceUsd: snapshot.current_price, volume24hUsd: snapshot.total_volume, marketCapUsd: snapshot.market_cap, change24hPct: snapshot.price_change_percentage_24h, trend7dPct: (closed.at(-1)![1] / closed.at(-8)![1] - 1) * 100, trend30dPct: (closed.at(-1)![1] / closed.at(-31)![1] - 1) * 100, trendConvention: "7/30-day changes between completed UTC daily observations; 24h from provider live snapshot", circulatingSupply: snapshot.circulating_supply, maxSupply: snapshot.max_supply, ...metrics, periodStart: new Date(closed[0][0]).toISOString(), periodEnd: new Date(closed[closed.length - 1][0]).toISOString(), newsCoverage: news.length ? "Recent matching third-party reports, not comprehensive or independently verified" : "Unavailable: no verified matching news; do not infer absence of incidents", missing: ["executable order-book liquidity and spread", "unlock schedule", "verified security-incident feed"] } },
      ...(documentation ? [documentation] : []),
    ] satisfies ResearchEvidence[];
    } catch (error) {
      signal?.throwIfAborted();
      if (!options.partial) throw error;
      histories.delete(asset.assetId);
      return [];
    }
  }));
  const evidence: ResearchEvidence[] = groups.flat();
  const eligible = candidates.filter(asset => histories.has(asset.assetId));
  for (const asset of eligible) {
    const left = histories.get(asset.assetId)!;
    const correlations = eligible.filter(other => other.assetId !== asset.assetId && (!options.partial || other.assetId === "bitcoin")).flatMap(other => {
      const right = histories.get(other.assetId)!;
      if (left.length !== right.length || left.some(([time], index) => time !== right[index][0])) {
        if (options.partial) return [];
        throw new Error("Correlation histories do not align.");
      }
      return [{ assetId: other.assetId, ...correlation(left.map(row => row[1]), right.map(row => row[1])) }];
    });
    evidence.find(source => source.id === `${asset.assetId}:market`)!.facts.correlations = correlations;
  }
  return evidence;
}
