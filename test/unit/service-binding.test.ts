// @vitest-environment node
import {afterEach,expect,test,vi} from "vitest";
import {maybeProxyRequest} from "@/lib/server/proxy";
import {hasBackendApiBaseUrl} from "@/lib/server/backend-config";

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});

test("runtime service binding takes precedence over local settings and preserves backend API paths/query",async()=>{
  vi.stubEnv("BACKEND_URL","https://internal.example/private/backend/");
  vi.stubEnv("BACKEND_API_BASE_URL","http://localhost:8000");
  const fetcher=vi.fn().mockResolvedValue(Response.json({coins:[]}));
  vi.stubGlobal("fetch",fetcher);
  expect(hasBackendApiBaseUrl()).toBe(true);
  const response=await maybeProxyRequest("/api/market/BTCUSDT/history",new URLSearchParams({interval:"1h",limit:"100"}));
  expect(response?.status).toBe(200);
  expect(String(fetcher.mock.calls[0][0])).toBe("https://internal.example/private/backend/api/market/BTCUSDT/history?interval=1h&limit=100");
});

test("standalone npm development retains its explicit local backend URL",async()=>{
  vi.stubEnv("BACKEND_URL","");
  vi.stubEnv("BACKEND_API_BASE_URL","http://localhost:8001");
  const fetcher=vi.fn().mockResolvedValue(Response.json({coins:[]}));
  vi.stubGlobal("fetch",fetcher);
  await maybeProxyRequest("/api/coins");
  expect(String(fetcher.mock.calls[0][0])).toBe("http://localhost:8001/api/coins");
});

test("proxy failures never disclose a private service URL to the browser",async()=>{
  vi.stubEnv("BACKEND_URL","https://internal.example/");
  vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("Connection to https://internal.example failed")));
  const response=await maybeProxyRequest("/api/coins");
  expect(response?.status).toBe(502);
  expect(await response?.text()).not.toContain("internal.example");
});
