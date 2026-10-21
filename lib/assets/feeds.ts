import { AnalysisError } from "@/lib/analysis/errors";
import { issue } from "@/lib/discover/contract";
import type { AssetFeed, AssetObservation, BrowseMarket, BrowseRange, BrowsedAsset } from "./types";

// Shared, bounded cache: repeated visits and simultaneous Discover requests reuse data.
// A caller cancelling its own request does not cancel other callers' shared fetch.
const cache = new Map<string, { expires: number; pending: Promise<unknown> }>();
async function cached<T>(key: string, ttl: number, read: () => Promise<T>): Promise<T> {
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.pending as Promise<T>;
  const pending = read().catch(error => { cache.delete(key); throw error; });
  if (cache.size >= 150) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + ttl, pending });
  return pending;
}
async function json(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000), cache: "no-store", redirect: "error" });
  if (!response.ok) throw new AnalysisError(issue("asset_feed_unavailable", "The free market feed is temporarily unavailable or rate-limited. Please try again later.", true));
  const raw = await response.text();
  if (raw.length > 5_000_000) throw new Error("Market response exceeds limit.");
  return JSON.parse(raw);
}
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const positive = (value: unknown): value is number => finite(value) && value > 0;
const optionalNumber = (value: unknown) => finite(value) ? value : null;
const validSymbol = (value: unknown): value is string => typeof value === "string" && /^[A-Z0-9][A-Z0-9.\-]{0,14}$/.test(value);
function checkedTime(raw: unknown, maxAge = 5 * 86400000) {
  const time = typeof raw === "number" ? raw : typeof raw === "string" ? Date.parse(raw) : NaN;
  if (!Number.isFinite(time) || time > Date.now() + 60000 || Date.now() - time > maxAge) throw new Error("Stale or invalid market observation.");
  return new Date(time).toISOString();
}
export function sgxTime(value: unknown) {
  if (typeof value !== "string" || !/^\d{8}_\d{6}$/.test(value)) throw new Error("Invalid SGX timestamp.");
  // SGX's own securities client parses this field with moment.utc, then applies
  // the viewer's offset. It is UTC despite the exchange's Singapore location.
  return checkedTime(`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(9,11)}:${value.slice(11,13)}:${value.slice(13,15)}Z`);
}

async function stocks(market: "us" | "sg"): Promise<BrowsedAsset[]> {
  return cached(`ranking:${market}`, 5 * 60000, async () => {
    if (market === "us") {
      const raw = await json("https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=10");
      const rows = raw.finance?.result?.[0]?.quotes;
      if (!Array.isArray(rows) || raw.finance?.error) throw new Error("US ranking unavailable.");
      const assets: BrowsedAsset[] = rows.filter(row => row.quoteType === "EQUITY" && row.currency === "USD" && validSymbol(row.symbol) && positive(row.regularMarketPrice) && positive(row.regularMarketVolume)).map(row => ({
        assetId: `stock:us:${row.symbol}`, assetClass: "stock", market, name: String(row.longName ?? row.shortName ?? row.symbol).slice(0,120), symbol: row.symbol, currency: "USD", price: row.regularMarketPrice,
        changePct: optionalNumber(row.regularMarketChangePercent), activity: row.regularMarketVolume, observedAt: checkedTime(row.regularMarketTime * 1000),
        sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(row.symbol)}/`, points: [],
      }));
      return assets.sort((a,b) => b.activity - a.activity).slice(0,10);
    }
    const raw = await json("https://api.sgx.com/securities/v1.1");
    if (String(raw.meta?.code) !== "200" || !Array.isArray(raw.data?.prices)) throw new Error("Singapore ranking unavailable.");
    // SGX v is traded value in listing currency; vl is volume expressed in thousands.
    // Restrict to SGD ordinary stocks so values are comparable and exclude warrants/ETFs.
    const assets: BrowsedAsset[] = raw.data.prices.filter((row: Record<string, unknown>) => row.type === "stocks" && row.cur === "SGD" && row.i !== "SUSP" && validSymbol(row.nc) && positive(row.lt) && positive(row.v)).map((row: Record<string, unknown>) => ({
      assetId: `stock:sg:${row.nc}`, assetClass: "stock", market, name: String(row["issuer-name"] ?? row.n ?? row.nc).slice(0,120), symbol: row.nc as string, currency: "SGD", price: row.lt as number,
      changePct: optionalNumber(row.p), activity: row.v as number, observedAt: sgxTime(row.trading_time), sourceUrl: "https://www.sgx.com/securities/stocks", points: [],
    }));
    return assets.sort((a,b) => b.activity - a.activity).slice(0,10);
  });
}

export function stockMetrics(points: AssetObservation[]) {
  if (points.length < 200) return undefined;
  const returns = points.slice(1).map((row,i) => Math.log(row.price / points[i].price));
  const mean = returns.reduce((sum,n) => sum+n,0) / returns.length;
  const annualizedLogVolatility = Math.sqrt(returns.reduce((sum,n) => sum+(n-mean)**2,0)/(returns.length-1)*252);
  let peak = points[0].price, maxDrawdown = 0;
  for (const row of points) { peak = Math.max(peak,row.price); maxDrawdown = Math.min(maxDrawdown,row.price/peak-1); }
  const latest = points.at(-1)!;
  const trend = (days: number) => { const past = points.findLast(row => row.time <= latest.time-days*86400000); return past ? (latest.price/past.price-1)*100 : null; };
  return { annualizedLogVolatility, maxDrawdown, observations: points.length, trend7dPct: trend(7), trend30dPct: trend(30), periodStart: new Date(points[0].time).toISOString(), periodEnd: new Date(latest.time).toISOString(), convention: "Completed trading-day provider-adjusted closes in listing currency; log returns, sample variance, sqrt(252). Calendar-day trend anchors use the nearest earlier trading observation. FX and cross-market correlations are not included." };
}
export async function stockHistory(asset: BrowsedAsset) {
  return cached(`history:${asset.assetId}`, 60 * 60000, async () => {
    const ticker = asset.market === "sg" ? `${asset.symbol}.SI` : asset.symbol;
    const raw = await json(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d`);
    const result = raw.chart?.result?.[0];
    if (raw.chart?.error || !result || result.meta?.symbol !== ticker || result.meta?.currency !== asset.currency || result.meta?.instrumentType !== "EQUITY") throw new Error("Stock history identity could not be verified.");
    const times = result.timestamp, prices = result.indicators?.adjclose?.[0]?.adjclose;
    if (!Array.isArray(times) || !Array.isArray(prices) || times.length !== prices.length || !times.length || times.length > 400) throw new Error("Adjusted stock history unavailable.");
    const points: AssetObservation[] = [];
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: result.meta.exchangeTimezoneName, year: "numeric", month: "2-digit", day: "2-digit" }).format(Date.now());
    for (let i=0;i<times.length;i++) {
      const time = times[i]*1000;
      if (!Number.isSafeInteger(time) || time > Date.now()+60000 || (i>0 && times[i] <= times[i-1])) throw new Error("Invalid stock history ordering.");
      if (prices[i] == null) continue; // Markets may publish explicit missing daily observations.
      if (!positive(prices[i])) throw new Error("Invalid adjusted stock price.");
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: result.meta.exchangeTimezoneName, year: "numeric", month: "2-digit", day: "2-digit" }).format(time);
      if (day === today && Date.now() < result.meta.currentTradingPeriod?.regular?.end*1000) continue;
      points.push({ time, price: prices[i] });
    }
    if (!points.length || Date.now()-points.at(-1)!.time > 5*86400000) throw new Error("Stock history is stale.");
    return { points, metrics: stockMetrics(points) };
  });
}

async function cryptoFeed(range: BrowseRange): Promise<BrowsedAsset[]> {
  const headers = process.env.COINGECKO_DEMO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_DEMO_API_KEY } : undefined;
  const rows = await cached("ranking:crypto", 5*60000, () => json("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=10&page=1&sparkline=false", headers));
  if (!Array.isArray(rows)) throw new Error("Crypto ranking unavailable.");
  return Promise.all(rows.slice(0,10).map(async row => {
    if (typeof row.id !== "string" || !/^[a-z0-9-]{1,100}$/.test(row.id) || !positive(row.current_price) || !positive(row.total_volume)) throw new Error("Invalid crypto market identity.");
    const asset: BrowsedAsset = { assetId: row.id, assetClass: "crypto", market: "crypto", name: String(row.name).slice(0,120), symbol: String(row.symbol).toUpperCase().slice(0,20), currency: "USD", price: row.current_price, changePct: optionalNumber(row.price_change_percentage_24h), activity: row.total_volume, observedAt: checkedTime(row.last_updated,15*60000), sourceUrl: `https://www.coingecko.com/en/coins/${row.id}`, points: [] };
    try {
      const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
      const history = await cached(`crypto:${row.id}:${days}`,5*60000,() => json(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(row.id)}/market_chart?vs_currency=usd&days=${days}`,headers));
      if (!Array.isArray(history.prices) || history.prices.length > 2000) throw new Error("Invalid chart.");
      asset.points = history.prices.map((point: unknown,index: number) => {
        if (!Array.isArray(point) || point.length!==2 || !Number.isSafeInteger(point[0]) || !positive(point[1]) || point[0]>Date.now()+60000 || (index>0 && point[0]<=history.prices[index-1][0])) throw new Error("Invalid chart observations.");
        return { time: point[0], price: point[1] };
      });
    } catch { asset.historyError = "Chart history is temporarily unavailable."; }
    return asset;
  }));
}

export async function assetFeed(market: BrowseMarket, range: BrowseRange): Promise<AssetFeed> {
  let assets: BrowsedAsset[];
  if (market === "crypto") assets = await cryptoFeed(range);
  else assets = await Promise.all((await stocks(market)).map(async asset => {
    try { return { ...asset, ...await stockHistory(asset) }; }
    catch { return { ...asset, historyError: "Adjusted history unavailable; historical risk is unknown." }; }
  }));
  if (!assets.length) throw new AnalysisError(issue("asset_feed_empty", "The free feed returned no usable assets for this market. Please try again later.", true));
  return {
    market, range, assets, checkedAt: new Date().toISOString(),
    ranking: market === "crypto" ? "24-hour traded value · USD" : market === "us" ? "Share volume · Yahoo Finance most-active universe" : "Traded value · SGD ordinary stocks on SGX",
    source: market === "crypto" ? "CoinGecko" : market === "us" ? "Yahoo Finance" : "SGX · history from Yahoo Finance",
    sourceUrl: market === "crypto" ? "https://www.coingecko.com/" : market === "us" ? "https://finance.yahoo.com/markets/stocks/most-active/" : "https://www.sgx.com/securities/stocks",
    limitations: market === "crypto" ? ["Volume is provider-reported and does not establish executable liquidity. Stablecoins and wrapped assets may appear in the ranking."] : ["Free public feeds can be delayed, incomplete or unavailable; this is not a guaranteed real-time service. Ranking covers the provider's stated universe, not search popularity.", "Charts use provider-adjusted daily closes; they can differ from the last traded price. Different market holidays and SGD currency exposure affect comparisons.", "Trading activity does not establish business quality, fair valuation or investment safety."],
  };
}
