// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { POST } from "@/app/api/portfolio/scenarios/route";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
test("scenario research is protected and ignores client-supplied validation claims", async () => {
  vi.stubEnv("ANALYSIS_ACCESS_TOKEN", "test-token");
  const request = new Request("http://localhost/api/portfolio/scenarios", { method: "POST", body: JSON.stringify({ validated: true, assets: [{ assetId: "bitcoin", currentValueCents: 10000 }] }) });
  expect((await POST(request)).status).toBe(401);
});
test("even passing synthetic historical controls cannot reveal estimates before release", async () => {
  vi.stubEnv("ANALYSIS_ACCESS_TOKEN", "test-token");
  vi.stubEnv("SCENARIO_RELEASE_ENABLED", "false");
  const today = Math.floor(Date.now() / 86400000) * 86400000;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ prices: Array.from({ length: 3650 }, (_, i) => [today - (3650 - i) * 86400000, 100]) })));
  const response = await POST(new Request("http://localhost/api/portfolio/scenarios", { method: "POST", headers: { Authorization: "Bearer test-token" }, body: JSON.stringify({ assets: [{ assetId: "bitcoin", currentValueCents: 10000 }] }) }));
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.status).toBe("research_only");
  expect(body.horizons.map((h: {
    years: number;
  }) => h.years)).toEqual([1, 3, 5]);
  for (const horizon of body.horizons) {
    expect(horizon.validation.folds).toBe(20);
    expect(horizon.validation.series.every((series: {
      passed: boolean;
    }) => series.passed)).toBe(true);
  }
  expect(body.horizons.map((h: {
    estimates: unknown;
  }) => h.estimates)).toEqual([null, null, null]);
});
test("scenario release approval must match the actual dataset and require empirical review", async () => {
  const { approvedScenarioHorizons, scenarioDatasetFingerprint } = await import("@/lib/analysis/scenario-release");
  const input = { assets: [{ assetId: "bitcoin", currentValueCents: 10000 }], history: [{ date: "2026-10-19", prices: [100] }], asOf: new Date().toISOString() };
  const report = { methodology: "joint-moving-block-v1", datasetSha256: scenarioDatasetFingerprint(input), approvedBy: "reviewer", reviewReference: "record", reviewedAt: new Date().toISOString(), liveCalibrationReviewed: true, stressTestsReviewed: true, sourcesReviewed: true, horizons: [1, 3, 5] };
  expect(approvedScenarioHorizons(report, input)).toEqual([1, 3, 5]);
  expect(approvedScenarioHorizons({ ...report, liveCalibrationReviewed: false }, input)).toEqual([]);
  expect(approvedScenarioHorizons(report, { ...input, history: [{ date: "2026-10-19", prices: [101] }] })).toEqual([]);
});
