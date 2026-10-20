import { releasedScenarioHorizons } from "@/lib/analysis/scenario-release";
import { authorizedAnalysis, readJson, reply } from "@/lib/analysis/http";
import { loadMarketHistory, CATALOG } from "@/lib/analysis/data";
import { reviewScenarios } from "@/lib/finance/scenarios";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!authorizedAnalysis(request))
    return reply({ status: "unavailable", message: "Scenario evaluation requires an authorized analysis client." }, 401);
  let assets: {
    assetId: string;
    currentValueCents: number;
  }[];
  try {
    const body = await readJson(request, 12000) as {
      assets: typeof assets;
    };
    assets = body.assets;
    if (!Array.isArray(assets) || !assets.length || assets.length > 5 || new Set(assets.map(x => x.assetId)).size !== assets.length || assets.some(asset => !CATALOG.some(x => x.assetId === asset.assetId) || !Number.isSafeInteger(asset.currentValueCents) || asset.currentValueCents <= 0))
      throw new Error();
  }
  catch {
    return reply({ status: "invalid_input" }, 400);
  }
  try {
    const histories = await Promise.all(assets.map(asset => loadMarketHistory(asset.assetId, 3650, request.signal)));
    const today = new Date().toISOString().slice(0, 10);
    const maps = histories.map(rows => new Map(rows.filter(([time]) => new Date(time).toISOString().slice(0, 10) < today).map(([time, price]) => [new Date(time).toISOString().slice(0, 10), price])));
    // Do not fill missing dates or silently shorten the overlap: every series must share dates.
    const dates = [...maps[0].keys()].sort();
    if (maps.some(map => map.size !== dates.length || dates.some(date => !map.has(date))))
      throw new Error("Histories do not align.");
    const input = { assets, asOf: new Date().toISOString(), history: dates.map(date => ({ date, prices: maps.map(map => map.get(date)!) })) };
    const reviewed = reviewScenarios(input);
    // Historical evaluation is necessary, not sufficient for a production forecasting claim.
    const released = await releasedScenarioHorizons(input);
    return reply({ status: released.length ? "evaluated" : "research_only", ...reviewed, horizons: reviewed.horizons.map(horizon => released.includes(horizon.years) ? horizon : { ...horizon, status: "unavailable", reason: horizon.reason ?? "release_review_required", estimates: null }), sources: assets.map(asset => ({ assetId: asset.assetId, url: `https://www.coingecko.com/en/coins/${asset.assetId}`, quote: "USD" })) });
  }
  catch {
    return reply({ status: "incomplete", message: "Aligned daily history or scenario validation is unavailable. No estimates are displayed." }, 503);
  }
}
