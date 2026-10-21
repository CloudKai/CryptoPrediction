// @vitest-environment node
import {expect,test} from "vitest";
import {screenCrypto, CRYPTO_SCREEN} from "@/lib/analysis/crypto-universe";

function row(id:string, extra:Record<string,unknown>={}) {
  return {id,name:id,symbol:id,current_price:10,market_cap:2_000_000_000,total_volume:20_000_000,last_updated:new Date().toISOString(),price_change_percentage_7d_in_currency:3,price_change_percentage_30d_in_currency:8,...extra};
}

test("screens activity plus positive-trend established candidates, excluding pegged/wrapped, stale and undersized candidates",()=>{
  const broad=[row("bitcoin"),row("chainlink"),row("negative",{price_change_percentage_7d_in_currency:-1}),row("tiny",{market_cap:100_000}),row("thin",{total_volume:100}),row("stale",{last_updated:"2020-01-01"}),row("wrapped",{name:"Wrapped Ether"}),row("usd-coin")];
  const result=screenCrypto([row("bitcoin"),row("usd-coin")],broad,[{id:"usd-coin"}]);
  expect(result.candidates.map(asset=>asset.assetId)).toEqual(["bitcoin","chainlink"]);
  expect(result.candidates[1].candidateReason).toContain("not predicted return");
  expect(result.snapshots.map(asset=>asset.id)).toEqual(["bitcoin","chainlink"]);
});

test("deduplicates canonical IDs, preserves the activity set and bounds extra history requests",()=>{
  const active=Array.from({length:10},(_,i)=>row(`active-${i}`));
  const broad=Array.from({length:20},(_,i)=>row(`extra-${i}`,{price_change_percentage_30d_in_currency:i+1}));
  const result=screenCrypto(active,[...active,...broad],[{id:"tether"}]);
  expect(result.candidates).toHaveLength(CRYPTO_SCREEN.maxCandidates);
  expect(result.candidates.slice(0,10).map(asset=>asset.assetId)).toEqual(active.map(asset=>asset.id));
  expect(result.candidates[10].assetId).toBe("extra-19");
  expect(new Set(result.candidates.map(asset=>asset.assetId)).size).toBe(result.candidates.length);
});

test("unknown stablecoin classification fails explicitly instead of silently admitting pegged assets",()=>{
  expect(()=>screenCrypto([row("bitcoin")],[row("bitcoin")],[])).toThrow(/classification/);
});
