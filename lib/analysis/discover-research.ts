import { assetFeed } from "@/lib/assets/feeds";
import type { BrowsedAsset } from "@/lib/assets/types";
import type { DiscoverInput } from "@/lib/discover/profile";
import { type ResearchEvidence } from "./data";
import { discoverCrypto } from "./crypto-universe";
import { AnalysisError } from "./errors";
import { issue } from "@/lib/discover/contract";

async function requiredResearch<T>(read: () => Promise<T>, code: string, message: string, signal?: AbortSignal): Promise<T> {
  try { return await read(); }
  catch (error) {
    signal?.throwIfAborted();
    if (error instanceof AnalysisError) throw error;
    throw new AnalysisError(issue(code,message,true,"incomplete"));
  }
}

export type ResearchAsset = { assetId: string; name: string; symbol: string; assetClass: "crypto" | "stock"; market: "crypto" | "us" | "sg"; currency: string; observedAt: string };
export async function discoverResearch(input: DiscoverInput, signal?: AbortSignal) {
  const selection = input.assetClass ?? "crypto";
  const stockMarket = input.stockMarket ?? "both";
  const includeCrypto = selection !== "stocks";
  const includeStocks = selection !== "crypto";
  const [crypto, feeds] = await Promise.all([
    includeCrypto ? requiredResearch(() => discoverCrypto(signal),"crypto_evidence_unavailable","Crypto prices or completed daily history could not be verified. Please try again shortly.",signal) : Promise.resolve({candidates:[],evidence:[] as ResearchEvidence[],excluded:[] as string[]}),
    includeStocks ? Promise.all((stockMarket === "both" ? ["us","sg"] as const : [stockMarket]).map(market => requiredResearch(() => assetFeed(market,"1y"),"stock_evidence_unavailable",`${market === "us" ? "US" : "Singapore"} stock quotes could not be verified. Please try again shortly.`,signal))) : Promise.resolve([]),
  ]);
  signal?.throwIfAborted();
  const stocks = feeds.flatMap(feed => feed.assets);
  const cryptoEvidence = crypto.evidence;
  const assets: ResearchAsset[] = [
    ...crypto.candidates.map(asset => ({ ...asset, assetClass: "crypto" as const, market: "crypto" as const, currency: "USD", observedAt: cryptoEvidence.find(source => source.id === `${asset.assetId}:market`)!.observedAt })),
    ...stocks.map(({ assetId,name,symbol,market,currency,observedAt }) => ({ assetId,name,symbol,market,currency,observedAt,assetClass:"stock" as const })),
  ];
  return { assets, evidence: [...cryptoEvidence,...stocks.flatMap(stockEvidence)], excludedCrypto:crypto.excluded };
}
function stockEvidence(asset: BrowsedAsset): ResearchEvidence[] {
  const ticker = asset.market === "sg" ? `${asset.symbol}.SI` : asset.symbol;
  const market: ResearchEvidence = { id: `${asset.assetId}:market`, assetId: asset.assetId, title: `${asset.market === "sg" ? "SGX" : "Yahoo Finance"} ${asset.symbol} ${asset.currency} quote`, url: asset.sourceUrl, observedAt: asset.observedAt,
    facts: { assetClass:"stock", listingMarket:asset.market, currency:asset.currency, price:asset.price, sessionChangePct:asset.changePct, tradingActivity:asset.activity, activityUnit:asset.market === "sg" ? "SGD traded value" : "shares traded in provider most-active universe", quoteStatus:"Latest available quote; may be delayed. Trading activity does not establish investment quality.", missing:["Verified earnings and filings","valuation and cash-flow analysis","executable liquidity","USD FX-adjusted returns and cross-asset correlations"] } };
  const history: ResearchEvidence = { id:`${asset.assetId}:history`, assetId:asset.assetId, title:`Yahoo Finance ${asset.symbol} adjusted price history`, url:`https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/history/`, observedAt: asset.points.length ? new Date(asset.points.at(-1)!.time).toISOString() : asset.observedAt,
    facts: asset.metrics ? { ...asset.metrics, currency:asset.currency } : { historicalRisk:"Unknown: fewer than 200 usable adjusted daily observations or history unavailable. Do not infer low risk from missing data.", currency:asset.currency } };
  return [market,history];
}
