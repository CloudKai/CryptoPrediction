import { correlation, liquidityEvidence, newsEvidence } from "./market-structure";
export const CATALOG = [
  { assetId: "bitcoin", name: "Bitcoin", symbol: "BTC", documentation: "https://bitcoin.org/en/how-it-works" },
  { assetId: "ethereum", name: "Ethereum", symbol: "ETH", documentation: "https://ethereum.org/en/developers/docs/intro-to-ethereum/" },
  { assetId: "solana", name: "Solana", symbol: "SOL", documentation: "https://solana.com/docs" },
] as const;
export type ResearchEvidence = {
  id: string;
  assetId: string;
  title: string;
  url: string;
  observedAt: string;
  facts: Record<string, unknown>;
};
async function json(url: string, key: string | undefined, signal?: AbortSignal) {
  const response = await fetch(url, { headers: key ? { "x-cg-demo-api-key": key } : {}, signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(15000)]), cache: "no-store", redirect: "error" });
  if (!response.ok)
    throw new Error("Market source unavailable.");
  const text = await response.text();
  if (text.length > 2000000)
    throw new Error("Market response exceeds limit.");
  return JSON.parse(text);
}
export async function loadMarketHistory(assetId: string, days: number, signal?: AbortSignal): Promise<[
  number,
  number
][]> {
  if (!CATALOG.some(asset => asset.assetId === assetId) || !Number.isInteger(days) || days < 1 || days > 10000)
    throw new Error("Unsupported asset history.");
  const raw = await json(`https://api.coingecko.com/api/v3/coins/${assetId}/market_chart?vs_currency=usd&days=${days}&interval=daily`, process.env.COINGECKO_DEMO_API_KEY, signal);
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
export async function collectEvidence(signal?: AbortSignal): Promise<ResearchEvidence[]> {
  const now = Date.now();
  const market = await json("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana", process.env.COINGECKO_DEMO_API_KEY, signal);
  if (!Array.isArray(market))
    throw new Error("Market evidence unavailable.");
  const histories = new Map<string, [
    number,
    number
  ][]>();
  const groups = await Promise.all(CATALOG.map(async (asset) => {
    const snapshot = market.find(row => row.id === asset.assetId);
    if (!snapshot || ![snapshot.current_price, snapshot.total_volume, snapshot.market_cap].every(value => Number.isFinite(value) && value > 0) || !Number.isFinite(Date.parse(snapshot.last_updated)) || now - Date.parse(snapshot.last_updated) > 900000 || Date.parse(snapshot.last_updated) > now + 60000)
      throw new Error("Stale or missing market evidence.");
    const history = await loadMarketHistory(asset.assetId, 365, signal);
    const closed = history.filter(([time]) => time < Math.floor(now / 86400000) * 86400000);
    if (!closed.length || now - closed[closed.length - 1][0] > 2 * 86400000)
      throw new Error("Daily market evidence is stale.");
    histories.set(asset.assetId, closed);
    const [liquidity, news] = await Promise.all([liquidityEvidence(asset, signal), newsEvidence(asset, signal)]);
    const response = await fetch(asset.documentation, { signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(15000)]), cache: "no-store", redirect: "error" });
    if (!response.ok)
      throw new Error("Primary documentation unavailable.");
    const html = await response.text();
    if (html.length > 3000000)
      throw new Error("Documentation too large.");
    const excerpt = html.replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
    if (excerpt.length < 200)
      throw new Error("Primary documentation could not be read.");
    return [
      liquidity, ...news,
      { id: `${asset.assetId}:market`, assetId: asset.assetId, title: `CoinGecko ${asset.name} USD market data`, url: `https://www.coingecko.com/en/coins/${asset.assetId}`, observedAt: snapshot.last_updated, facts: { priceUsd: snapshot.current_price, volume24hUsd: snapshot.total_volume, marketCapUsd: snapshot.market_cap, circulatingSupply: snapshot.circulating_supply, maxSupply: snapshot.max_supply, ...marketMetrics(closed.map(row => row[1])), periodStart: new Date(closed[0][0]).toISOString(), periodEnd: new Date(closed[closed.length - 1][0]).toISOString(), newsCoverage: news.length ? "Recent matching third-party reports, not comprehensive or independently verified" : "Unavailable: no verified matching news; do not infer absence of incidents", missing: ["unlock schedule", "verified security-incident feed"] } },
      { id: `${asset.assetId}:docs`, assetId: asset.assetId, title: `${asset.name} primary documentation (retrieved, not publication date)`, url: asset.documentation, observedAt: new Date(now).toISOString(), facts: { untrustedExcerpt: excerpt } },
    ] satisfies ResearchEvidence[];
  }));
  const evidence: ResearchEvidence[] = groups.flat();
  for (const asset of CATALOG) {
    const left = histories.get(asset.assetId)!;
    const correlations = CATALOG.filter(other => other.assetId !== asset.assetId).map(other => {
      const right = histories.get(other.assetId)!;
      if (left.length !== right.length || left.some(([time], index) => time !== right[index][0]))
        throw new Error("Correlation histories do not align.");
      return { assetId: other.assetId, ...correlation(left.map(row => row[1]), right.map(row => row[1])) };
    });
    evidence.find(source => source.id === `${asset.assetId}:market`)!.facts.correlations = correlations;
  }
  return evidence;
}
