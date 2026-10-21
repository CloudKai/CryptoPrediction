// @vitest-environment node
import { afterEach,beforeEach,expect,test,vi } from "vitest";

beforeEach(()=>vi.resetModules());
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});

test("Singapore activity ranking excludes non-stock and non-SGD instruments and keeps quotes when history fails",async()=>{
  const local=new Date(Date.now()).toISOString().replaceAll("-","").replaceAll(":","");
  const trading_time=local.slice(0,8)+"_"+local.slice(9,15);
  const row={nc:"D05",n:"DBS",type:"stocks",cur:"SGD",lt:70,v:1000,p:1,trading_time};
  const fetcher=vi.fn(async(input:RequestInfo|URL)=>String(input).includes("sgx.com")?Response.json({meta:{code:"200"},data:{prices:[row,{...row,nc:"O39",n:"OCBC",v:2000},{...row,nc:"ETF1",type:"etfs",v:999999},{...row,nc:"USD1",cur:"USD",v:999999}]}}):Response.json({chart:{error:{code:"Not Found"}}}));
  vi.stubGlobal("fetch",fetcher);
  const {assetFeed}=await import("@/lib/assets/feeds");
  const feed=await assetFeed("sg","1mo");
  expect(feed.assets.map(row=>row.symbol)).toEqual(["O39","D05"]);
  expect(feed.assets.every(row=>row.currency==="SGD"&&row.historyError&&row.points.length===0)).toBe(true);
  await assetFeed("sg","1y");
  expect(fetcher.mock.calls.filter(([url])=>String(url).includes("sgx.com"))).toHaveLength(1);
});

test("SGX source timestamps are UTC, not Singapore local time, and reject future or stale observations",async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
  const {sgxTime}=await import("@/lib/assets/feeds");
  expect(sgxTime("20261022_093000")).toBe("2026-10-22T09:30:00.000Z");
  expect(()=>sgxTime("20261023_093000")).toThrow();
  expect(()=>sgxTime("20261001_093000")).toThrow();
});

test("stock risk requires sufficient adjusted observations and computes trading-day downside",async()=>{
  const {stockMetrics}=await import("@/lib/assets/feeds");
  expect(stockMetrics(Array.from({length:30},(_,i)=>({time:i*86400000,price:100})))).toBeUndefined();
  const points=Array.from({length:250},(_,i)=>({time:i*86400000,price:i===249?50:100}));
  const metrics=stockMetrics(points)!;
  expect(metrics.maxDrawdown).toBe(-.5);
  expect(metrics.annualizedLogVolatility).toBeGreaterThan(0);
  expect(metrics.convention).toContain("sqrt(252)");
});

test("asset API rejects unsupported markets before contacting providers",async()=>{
  const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
  const {GET}=await import("@/app/api/assets/route");
  expect((await GET(new Request("http://localhost/api/assets?market=unknown"))).status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
