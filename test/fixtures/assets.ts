import type { AssetFeed, BrowseMarket, BrowseRange } from "@/lib/assets/types";

// Synthetic browser fixtures, never imported by application code.
export function assetFeedFixture(market: BrowseMarket = "crypto", range: BrowseRange = "24h"): AssetFeed {
  const now = Date.now();
  const entries = market === "crypto" ? [["bitcoin","Bitcoin","BTC"],["ethereum","Ethereum","ETH"],["binancecoin","BNB","BNB"]] : market === "us" ? [["stock:us:NVDA","NVIDIA","NVDA"],["stock:us:T","AT&T","T"]] : [["stock:sg:D05","DBS","D05"],["stock:sg:O39","OCBC Bank","O39"]];
  return { market,range,checkedAt:new Date(now).toISOString(),ranking:"Synthetic activity ranking for browser verification",source:"Synthetic fixture",sourceUrl:"https://example.test/market",limitations:["Synthetic data, not investment analysis."],assets:entries.map(([assetId,name,symbol],i)=>({assetId,name,symbol,market,assetClass:market === "crypto" ? "crypto" : "stock",currency:market === "sg" ? "SGD" : "USD",price:100+i,changePct:i===1?-1:2,activity:1000000-i,observedAt:new Date(now).toISOString(),sourceUrl:"https://example.test/source",points:Array.from({length:40},(_,j)=>({time:now-(39-j)*86400000,price:90+j*.3+i}))})) };
}
