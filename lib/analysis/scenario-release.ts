import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { SCENARIO_METHOD, type ScenarioInput } from "@/lib/finance/scenarios";
export function scenarioDatasetFingerprint(input: ScenarioInput) { return createHash("sha256").update(JSON.stringify({ assets: input.assets.map(asset => asset.assetId), history: input.history })).digest("hex"); }
export function approvedScenarioHorizons(report: unknown, input: ScenarioInput, now = Date.now()): number[] {
  if (!report || typeof report !== "object")
    return [];
  const value = report as Record<string, unknown>;
  if (value.methodology !== SCENARIO_METHOD || value.datasetSha256 !== scenarioDatasetFingerprint(input) || typeof value.approvedBy !== "string" || !value.approvedBy.trim() || typeof value.reviewReference !== "string" || !value.reviewReference.trim() || typeof value.reviewedAt !== "string" || !Number.isFinite(Date.parse(value.reviewedAt)) || Date.parse(value.reviewedAt) > now + 60000 || now - Date.parse(value.reviewedAt) > 30 * 86400000 || value.liveCalibrationReviewed !== true || value.stressTestsReviewed !== true || value.sourcesReviewed !== true || !Array.isArray(value.horizons))
    return [];
  return value.horizons.filter(years => [1, 3, 5].includes(years));
}
export async function releasedScenarioHorizons(input: ScenarioInput): Promise<number[]> {
  const file = process.env.SCENARIO_REVIEW_REPORT_PATH;
  if (process.env.SCENARIO_RELEASE_ENABLED !== "true" || !file)
    return [];
  try {
    const text = await readFile(file, "utf8");
    if (text.length > 100000)
      return [];
    return approvedScenarioHorizons(JSON.parse(text), input);
  }
  catch {
    return [];
  }
}
