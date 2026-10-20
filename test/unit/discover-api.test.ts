// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { POST } from "@/app/api/allocation/route";
import { completeFixture, validInput } from "../fixtures/discover";
const request = (input: unknown = validInput) => new Request("http://localhost/api/allocation", { method: "POST", body: JSON.stringify(input), headers: { "Content-Type": "application/json" } });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("allocation service bridge", () => {
  test("does not claim analysis when no service exists", async () => {
    vi.stubEnv("ALLOCATION_SERVICE_URL", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: "unavailable", code: "analysis_not_connected" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  test("rejects invalid profiles before an upstream call", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await POST(request({ budgetCents: 10000, currency: "USD" }))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  test("passes fixed token caps, verifies the completed response, and disables caching", async () => {
    vi.stubEnv("ALLOCATION_SERVICE_URL", "https://analysis.example.test/allocate");
    const fetcher = vi.fn().mockResolvedValue(Response.json(completeFixture()));
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.parse(fetcher.mock.calls[0][1].body).limits).toEqual({ totalTokens: 15000, explanationTokens: 1500 });
    expect((await response.json()).status).toBe("complete");
  });
  test("does not expose malformed results or upstream errors", async () => {
    vi.stubEnv("ALLOCATION_SERVICE_URL", "https://analysis.example.test/allocate");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: "complete", privateError: "secret-debug-content" })));
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(502);
    expect(body.code).toBe("invalid_analysis");
    expect(JSON.stringify(body)).not.toContain("secret-debug-content");
  });
});
test("external responses must respect concentration constraints on final rounded amounts", async () => {
  vi.stubEnv("SPECIALIST_ANALYSIS_ENABLED", "false");
  vi.stubEnv("ALLOCATION_SERVICE_URL", "https://analysis.example.test/allocate");
  const result = completeFixture();
  result.allocations[0].weightBps = 9000;
  result.allocations[0].amountCents = 90000;
  result.allocations[1].weightBps = 500;
  result.allocations[1].amountCents = 5000;
  result.allocations[2].weightBps = 500;
  result.allocations[2].amountCents = 5000;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(result)));
  const response = await POST(request());
  expect(response.status).not.toBe(200);
  expect((await response.json()).status).not.toBe("complete");
});
