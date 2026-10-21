import { CATALOG, collectEvidence, cryptoJson, type CryptoCandidate } from "./data";
import { AnalysisError } from "./errors";
import { issue } from "@/lib/discover/contract";

type MarketRow = Record<string, unknown> & { id: string; name: string; symbol: string };
const BASE = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd";
export const CRYPTO_SCREEN = { maxCandidates: 15, additionalMomentum: 5, minMarketCapUsd: 1_000_000_000, minVolumeUsd: 10_000_000 };
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
function usable(value: unknown): value is MarketRow {
  if (!value || typeof value !== "object") return false;
  const row = value as MarketRow;
  const time = typeof row.last_updated === "string" ? Date.parse(row.last_updated) : NaN;
  return typeof row.id === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(row.id)
    && typeof row.name === "string" && row.name.length > 0 && row.name.length <= 120
    && typeof row.symbol === "string" && row.symbol.length > 0 && row.symbol.length <= 20
    && [row.current_price,row.market_cap,row.total_volume].every(positive)
    && Number.isFinite(time) && Date.now()-time <= 15*60000 && time <= Date.now()+60000;
}

/** Screening is observable inclusion evidence, never an expected-return score. */
export function screenCrypto(volume: unknown, capitalized: unknown, stablecoins: unknown) {
  if (![volume,capitalized,stablecoins].every(Array.isArray)) throw new Error("Crypto screening sources unavailable.");
  const pegged = new Set((stablecoins as unknown[]).flatMap(row => row && typeof row === "object" && typeof (row as MarketRow).id === "string" ? [(row as MarketRow).id] : []));
  if (!pegged.size) throw new Error("Stablecoin classification unavailable.");
  const supported = (row: unknown): row is MarketRow => usable(row) && !pegged.has(row.id)
    && !/\b(wrapped|bridged|staked|liquid staking)\b/i.test(row.name);
  const active = (volume as unknown[]).slice(0,10).filter(supported);
  const broad = (capitalized as unknown[]).slice(0,100).filter(supported);
  const candidates = new Map<string, CryptoCandidate>();
  const snapshots = new Map<string,MarketRow>();
  const add = (row: MarketRow, reason: string) => {
    if (candidates.has(row.id) || candidates.size >= CRYPTO_SCREEN.maxCandidates) return;
    const curated = CATALOG.find(asset => asset.assetId === row.id);
    candidates.set(row.id,{assetId:row.id,name:row.name,symbol:row.symbol.toUpperCase(),documentation:curated?.documentation,candidateReason:reason});
    snapshots.set(row.id,row);
  };
  // Preserve the visible activity candidates before adding broader signals.
  active.forEach(row => add(row,"Top-10 provider-reported 24h USD trading activity; activity is not investment quality"));
  for (const asset of CATALOG) {
    const row = broad.find(row => row.id === asset.assetId);
    if (row) add(row,"Established research benchmark in the provider top-100 market-cap universe");
  }
  broad.filter(row => positive(row.price_change_percentage_7d_in_currency) && positive(row.price_change_percentage_30d_in_currency)
    && (row.market_cap as number) >= CRYPTO_SCREEN.minMarketCapUsd && (row.total_volume as number) >= CRYPTO_SCREEN.minVolumeUsd)
    .sort((a,b) => Number(b.price_change_percentage_30d_in_currency)-Number(a.price_change_percentage_30d_in_currency) || a.id.localeCompare(b.id))
    .filter(row => !candidates.has(row.id)).slice(0,CRYPTO_SCREEN.additionalMomentum)
    .forEach(row => add(row,"Additional research candidate: positive provider 7d/30d price changes, market cap >= $1bn and reported daily volume >= $10m; ranked by 30d change, not predicted return"));
  return {candidates:[...candidates.values()],snapshots:[...snapshots.values()]};
}

// A short server-only cache bounds free-feed usage and coalesces concurrent forms.
// Shared retrieval is independent of any single browser cancelling its request.
let cached: { expires: number; pending: ReturnType<typeof research> } | undefined;
async function research() {
  const [volume,capitalized,stablecoins] = await Promise.all([
    cryptoJson(`${BASE}&order=volume_desc&per_page=10&page=1&sparkline=false`),
    cryptoJson(`${BASE}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=7d,30d`),
    cryptoJson(`${BASE}&category=stablecoins&order=market_cap_desc&per_page=250&page=1&sparkline=false`),
  ]);
  const screened = screenCrypto(volume,capitalized,stablecoins);
  const evidence = await collectEvidence(undefined,{...screened,requireDocumentation:false,partial:true});
  const candidates = screened.candidates.filter(asset => evidence.some(source => source.id === `${asset.assetId}:market`));
  if (!candidates.length) throw new AnalysisError(issue("crypto_evidence_unavailable","No crypto candidates had sufficiently current prices and at least 250 completed daily observations. Please try again later.",true,"incomplete"));
  return {candidates,evidence,excluded:screened.candidates.filter(asset => !candidates.includes(asset)).map(asset => asset.name)};
}
export async function discoverCrypto(signal?: AbortSignal) {
  if (!cached || cached.expires <= Date.now()) {
    const pending = research();
    const entry = {expires:Date.now()+5*60000,pending};
    cached = entry;
    pending.catch(() => { if (cached === entry) cached = undefined; });
  }
  const result = await cached.pending;
  signal?.throwIfAborted();
  return result;
}
