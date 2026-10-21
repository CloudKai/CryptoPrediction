// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { validInput } from "../fixtures/discover";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
beforeEach(() => vi.resetModules());

function proposal(weights = [4000, 3500, 2500], ids = ["bitcoin", "ethereum", "solana"]) {
  return {
    unsupportedReason: null,
    weights: ids.map((assetId, i) => ({ assetId, weightBps: weights[i] })),
    assets: ids.map(assetId => ({ assetId, claims: [{ text: "Relative trend and risk comparison.", evidenceIds: [`${assetId}:market`] }], risks: [{ text: "Historical losses can recur.", evidenceIds: [`${assetId}:market`] }] })),
    portfolioRisk: { text: "Positions can decline together.", evidenceIds: [`${ids[0]}:market`] },
    limitations: ["Synthetic test evidence only."],
  };
}

function setup(output: unknown = proposal(), documentationUnavailable = false) {
  vi.stubEnv("SPECIALIST_ANALYSIS_ENABLED", "true");
  vi.stubEnv("DISCOVER_AI_RECOMMENDATIONS_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  vi.stubEnv("CRYPTO_ANALYSIS_MODEL", "test-model");
  vi.stubEnv("ALLOCATION_STRATEGY_JSON", "");
  vi.stubEnv("SPECIALIST_EVALUATION_REPORT_PATH", "");
  vi.stubEnv("NEWSDATA_API_KEY", "");
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("screener/predefined")) return Response.json({finance:{result:[{quotes:[{symbol:"NVDA",quoteType:"EQUITY",currency:"USD",longName:"NVIDIA",regularMarketPrice:100,regularMarketVolume:1000000,regularMarketTime:Math.floor(Date.now()/1000),regularMarketChangePercent:1}]}]}});
    if (url.includes("api.sgx.com")) return Response.json({meta:{code:"200"},data:{prices:[{nc:"D05",n:"DBS",type:"stocks",cur:"SGD",lt:50,v:1000000,p:1,trading_time: new Date(Date.now()-60000).toISOString().replaceAll("-","").replaceAll(":","").replace("T","_").slice(0,15)}]}});
    if (url.includes("finance/chart")) {
      const symbol = decodeURIComponent(new URL(url).pathname.split("/").at(-1)!);
      return Response.json({chart:{result:[{meta:{symbol,currency:symbol.endsWith(".SI")?"SGD":"USD",instrumentType:"EQUITY",exchangeTimezoneName:"UTC",currentTradingPeriod:{regular:{end:Date.now()/1000+3600}}},timestamp:Array.from({length:251},(_,i)=>Math.floor(Date.now()/86400000)*86400-(251-i)*86400),indicators:{adjclose:[{adjclose:Array.from({length:251},(_,i)=>100+i)}]}}]}});
    }
    if (url.includes("coins/markets"))
      return Response.json(new URL(url).searchParams.get("category") === "stablecoins" ? [{id:"tether"}] : ["bitcoin", "ethereum", "solana", "chainlink"].map(id => ({ id,name:id,symbol:id, current_price: 100, total_volume: 1000000, market_cap: 100000000, last_updated: new Date().toISOString(), price_change_percentage_24h: 1 })));
    if (url.includes("market_chart"))
      return Response.json({ prices: Array.from({ length: 365 }, (_, i) => [Math.floor(Date.now() / 86400000) * 86400000 - (365 - i) * 86400000, 100 + i]) });
    if (url.endsWith("input_tokens")) return Response.json({ input_tokens: 8000 });
    if (url.endsWith("/responses")) {
      const body = JSON.parse(String(init?.body));
      expect(body.input).toContain("trend30dPct");
      expect(body.input).toContain(validInput.preferences);
      expect(body.input).toContain("Would losing this amount affect essential expenses or emergency savings?");
      expect(body.instructions).toContain("WOULD NOT affect essential expenses");
      expect(body.text.format.schema.required).toContain("weights");
      return Response.json({ id: "resp_test_only", status: "completed", usage: { input_tokens: 8000, output_tokens: 900, total_tokens: 8900 }, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(output) }] }] });
    }
    return documentationUnavailable ? new Response("Unavailable", {status:503}) : new Response("<main>" + "Primary protocol documentation. ".repeat(30) + "</main>");
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

async function request(input = validInput) {
  const {POST} = await import("@/app/api/allocation/route");
  return POST(new Request("http://localhost/api/allocation", { method: "POST", body: JSON.stringify(input) }));
}

test("Discover generates a sourced experimental AI allocation without a fixed basket or fabricated approval", async () => {
  const fetcher = setup();
  const response = await request({ ...validInput, budgetCents: 100001 });
  const result = await response.json();
  expect(response.status).toBe(200);
  expect(result.status).toBe("complete");
  expect(result.allocations.reduce((sum: number, row: { amountCents: number }) => sum + row.amountCents, 0)).toBe(100001);
  expect(result.allocations.every((row: { amountCents: number }) => row.amountCents <= 50000)).toBe(true);
  expect(result.riskSummary).toContain("Experimental AI proposal");
  expect(result.methodology).toContain("has not passed");
  expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/responses"))).toHaveLength(1);
  expect(fetcher.mock.calls.some(([url]) => String(url).includes("coinbase"))).toBe(false);
});

test("Discover can use verified market evidence when supplementary project documentation is unavailable", async () => {
  const fetcher = setup(proposal(), true);
  const response = await request();
  const result = await response.json();
  expect(response.status).toBe(200);
  expect(result.status).toBe("complete");
  expect(result.limitations.join(" ")).toContain("Primary project documentation was unavailable");
  const generation = fetcher.mock.calls.find(([url]) => String(url).endsWith("/responses"))!;
  const payload = JSON.parse(String(generation[1]?.body));
  expect(JSON.parse(payload.input).evidence.some((source: {id:string}) => source.id.endsWith(":docs"))).toBe(false);
});

test("a model citation failure identifies the explanation stage instead of the generic incomplete error", async () => {
  const output = proposal();
  output.assets[0].claims[0].evidenceIds = ["invented:source"];
  setup(output);
  const response = await request();
  expect(await response.json()).toMatchObject({status:"incomplete",code:"analysis_citations_invalid"});
});

test("missing daily history still blocks Discover before OpenAI even when documentation is optional", async () => {
  const fetcher = setup();
  const original = fetcher.getMockImplementation()!;
  fetcher.mockImplementation(async (url,init) => String(url).includes("market_chart") ? Response.json({prices:[]}) : original(url,init));
  const response = await request();
  expect(await response.json()).toMatchObject({status:"incomplete",code:"crypto_evidence_unavailable"});
  expect(fetcher.mock.calls.some(([url]) => String(url).includes("api.openai.com"))).toBe(false);
});

test("Discover can recommend a verified coin beyond the old three-coin catalog", async () => {
  setup(proposal([5000,5000],["bitcoin","chainlink"]));
  const response = await request();
  expect(response.status).toBe(200);
  expect((await response.json()).allocations.map((asset:{assetId:string}) => asset.assetId)).toEqual(["bitcoin","chainlink"]);
});

test("one candidate's failed history is excluded while other verified candidates still work", async () => {
  const fetcher = setup(proposal([5000,5000],["bitcoin","chainlink"]));
  const original = fetcher.getMockImplementation()!;
  fetcher.mockImplementation(async (url,init) => String(url).includes("/coins/solana/market_chart") ? Response.json({prices:[]}) : original(url,init));
  const response = await request();
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.limitations.join(" ")).toContain("excluded because");
  expect(result.allocations.some((asset:{assetId:string}) => asset.assetId === "solana")).toBe(false);
});

test.each([
  [proposal([5001, 2999, 2000]), "allocation_constraints"],
  [proposal([4000, 3000, 2000]), "allocation_constraints"],
  [{ ...proposal(), weights: [{ assetId: "invented", weightBps: 5000 }, { assetId: "bitcoin", weightBps: 5000 }] }, "allocation_constraints"],
  [{ ...proposal(), unsupportedReason: "Request excludes all eligible assets", assets: [], weights: [] }, "unsupported_preferences"],
])("rejects invalid or unsupported AI proposals", async (output, code) => {
  setup(output);
  const response = await request();
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code });
});

test("does not spend model tokens when losses could affect essential funds", async () => {
  const fetcher = setup();
  const response = await request({ ...validInput, profile: { ...validInput.profile, capacity: "yes" } });
  expect(await response.json()).toMatchObject({ status: "unsupported", code: "unsupported_profile" });
  expect(fetcher).not.toHaveBeenCalled();
});

test("stock-only Discover allocates across US and Singapore using stock identities and trading-session freshness", async () => {
  setup(proposal([5000,5000],["stock:us:NVDA","stock:sg:D05"]));
  const response = await request({...validInput,assetClass:"stocks",stockMarket:"both"});
  expect(response.status).toBe(200);
  const result=await response.json();
  expect(result.allocations.map((row:{assetId:string})=>row.assetId)).toEqual(["stock:us:NVDA","stock:sg:D05"]);
  expect(result.marketObservations.every((row:{assetClass:string})=>row.assetClass==="stock")).toBe(true);
  expect(result.allocations.reduce((sum:number,row:{amountCents:number})=>sum+row.amountCents,0)).toBe(validInput.budgetCents);
});

test("mixed Discover must include both requested asset classes", async () => {
  setup(proposal());
  const response=await request({...validInput,assetClass:"both",stockMarket:"us"});
  expect(await response.json()).toMatchObject({code:"allocation_market_mismatch"});
});

test("mixed Discover accepts a sourced stock and crypto allocation with exact USD totals", async () => {
  setup(proposal([5000,5000],["bitcoin","stock:us:NVDA"]));
  const response=await request({...validInput,assetClass:"both",stockMarket:"us"});
  expect(response.status).toBe(200);
  const result=await response.json();
  expect(result.marketObservations.map((row:{assetClass:string})=>row.assetClass)).toEqual(["crypto","stock"]);
});
