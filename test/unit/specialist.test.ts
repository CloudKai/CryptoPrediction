// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EVALUATION_CASES, skillFingerprint } from "@/lib/analysis/evaluation";
import { explainEvidence } from "@/lib/analysis/model";
const temporaryDirectories: string[] = [];
afterEach(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))); });
test("refuses an over-budget input before making a model-generation call", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ input_tokens: 14000 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(explainEvidence({ instructions: "crypto specialist", input: "dated evidence" }, { key: "test", model: "test-model" })).rejects.toThrow(/budget/);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test("rejects explanations citing invented or unrelated evidence", async () => {
  const { validateExplanation } = await import("@/lib/analysis/explanation");
  expect(() => validateExplanation({ assets: [{ assetId: "bitcoin", claims: [{ text: "A claim", evidenceIds: ["made-up"] }], risks: [] }], portfolioRisk: { text: "Risk", evidenceIds: ["made-up"] }, limitations: ["Unknown"] }, ["bitcoin"], [])).toThrow(/evidence|explanation/i);
});
test("the real allocation pipeline owns amounts and rejects unsupported profiles before model calls", async () => {
  const { generateAllocation } = await import("@/lib/analysis/service");
  const { validInput } = await import("../fixtures/discover");
  vi.stubEnv("SPECIALIST_ANALYSIS_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubEnv("CRYPTO_ANALYSIS_MODEL", "test-model");
  vi.stubEnv("ALLOCATION_STRATEGY_JSON", JSON.stringify({ version: "synthetic-test-policy", reviewReference: "fixture-only", preferences: "unsupported", weights: [{ assetId: "bitcoin", weightBps: 4000 }, { assetId: "ethereum", weightBps: 4000 }, { assetId: "solana", weightBps: 2000 }], profiles: { horizon: ["3_5"], capacity: ["no"], reaction: ["hold"], experience: ["basic"], holdings: ["none"] } }));
  const directory = await mkdtemp(path.join(os.tmpdir(), "crypto-evaluation-test-"));
  temporaryDirectories.push(directory);
  const receipt = path.join(directory, "report.json");
  await writeFile(receipt, JSON.stringify({ model: "test-model", skillSha256: await skillFingerprint(), provenance: "live-model-human-reviewed", approvedBy: "synthetic-fixture-only", reviewedAt: new Date().toISOString(), cases: EVALUATION_CASES.map(id => ({ id, structurallyValid: true, responseId: `resp_fixture_${id}`, baselineResponseId: `resp_baseline_fixture_${id}`, criticalFailures: 0, specialistScore: 1, baselineScore: .8 })) }));
  vi.stubEnv("SPECIALIST_EVALUATION_REPORT_PATH", receipt);
  const fetcher = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = String(input);
    if (url.includes("coinbase.com"))
      return Response.json({ bids: [["99.9", "100", 1]], asks: [["100.1", "100", 1]], time: new Date().toISOString() });
    if (url.includes("coins/markets"))
      return Response.json(["bitcoin", "ethereum", "solana"].map(id => ({ id, current_price: 100, total_volume: 100000000, market_cap: 1000000000, last_updated: new Date().toISOString() })));
    if (url.includes("market_chart"))
      return Response.json({ prices: Array.from({ length: 365 }, (_, i) => [Math.floor(Date.now() / 86400000) * 86400000 - (365 - i) * 86400000, 100 + i]) });
    if (url.endsWith("input_tokens"))
      return Response.json({ input_tokens: 7000 });
    if (url.endsWith("/responses")) {
      const body = JSON.parse(String(options?.body));
      expect(body.max_output_tokens).toBe(1500);
      expect(body.instructions).toContain("tokenomics");
      const output = { assets: ["bitcoin", "ethereum", "solana"].map(assetId => ({ assetId, claims: [{ text: "Documented protocol research with market observations.", evidenceIds: [`${assetId}:market`, `${assetId}:docs`] }], risks: [{ text: "Historical losses can recur.", evidenceIds: [`${assetId}:market`] }] })), portfolioRisk: { text: "All positions remain exposed to crypto market risk.", evidenceIds: ["bitcoin:market"] }, limitations: ["Synthetic test evidence, not investment analysis."] };
      return Response.json({ status: "completed", usage: { input_tokens: 7000, output_tokens: 900, total_tokens: 7900 }, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(output) }] }] });
    }
    return new Response("<main>" + "Primary protocol documentation. ".repeat(40) + "</main>");
  });
  vi.stubGlobal("fetch", fetcher);
  const unsupported = await generateAllocation({ ...validInput, profile: { ...validInput.profile, capacity: "yes" }, preferences: "" });
  expect(unsupported.status).toBe("unsupported");
  expect(fetcher).not.toHaveBeenCalled();
  const result = await generateAllocation({ ...validInput, preferences: "", budgetCents: 101 });
  expect(result.status).toBe("complete");
  if (result.status === "complete")
    expect(result.allocations.map(asset => asset.amountCents)).toEqual([41, 40, 20]);
  vi.unstubAllEnvs();
});
test("historical adapters reject duplicate, out-of-order and gapped daily observations", async () => {
  const { loadMarketHistory } = await import("@/lib/analysis/data");
  for (const prices of [[[0, 100], [0, 100]], [[86400000, 100], [0, 100]], [[0, 100], [172800000, 100]]]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ prices })));
    await expect(loadMarketHistory("bitcoin", 365)).rejects.toThrow(/daily|history/i);
  }
});
test("specialist activation requires a reviewed comparison for the configured model and skill pack", async () => {
  const { validateEvaluationReport } = await import("@/lib/analysis/evaluation");
  const report = { model: "tested", skillSha256: "pack", approvedBy: "reviewer", reviewedAt: new Date().toISOString(), provenance: "live-model-human-reviewed", cases: EVALUATION_CASES.map(id => ({ id, structurallyValid: true, responseId: `resp_actual_${id}`, baselineResponseId: `resp_baseline_${id}`, criticalFailures: 0, specialistScore: 1, baselineScore: .8 })) };
  expect(validateEvaluationReport(report, "tested", "pack")).toBe(true);
  expect(validateEvaluationReport(report, "different", "pack")).toBe(false);
  expect(validateEvaluationReport({ ...report, cases: report.cases.slice(1) }, "tested", "pack")).toBe(false);
  expect(validateEvaluationReport({ ...report, cases: report.cases.map(row => ({ ...row, baselineScore: 1 })) }, "tested", "pack")).toBe(false);
});
