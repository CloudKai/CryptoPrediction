import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
export const EVALUATION_CASES = ["ticker_collision", "token_value", "unlock_conflict", "thin_book", "correlation", "unsupported_profile", "stale_conflicting", "source_injection", "additional_purchase", "baseline_only", "short_history", "joint_portfolio", "allocation_mismatch", "token_budget"] as const;
export async function loadSkillPack() { const root = path.join(process.cwd(), "docs/agent-skills/crypto-analysis"); return (await Promise.all(["SKILL.md", "references/metrics.md"].map(file => readFile(path.join(root, file), "utf8")))).join("\n\n"); }
export async function skillFingerprint() { return createHash("sha256").update(await loadSkillPack()).digest("hex"); }
export function validateEvaluationReport(report: unknown, model: string, fingerprint: string, now = Date.now()): boolean {
  if (!report || typeof report !== "object")
    return false;
  const value = report as Record<string, unknown>;
  const reviewed = typeof value.reviewedAt === "string" ? Date.parse(value.reviewedAt) : NaN;
  if (value.model !== model || value.skillSha256 !== fingerprint || value.provenance !== "live-model-human-reviewed" || typeof value.approvedBy !== "string" || !value.approvedBy.trim() || !Number.isFinite(reviewed) || reviewed > now + 60000 || now - reviewed > 90 * 86400000 || !Array.isArray(value.cases) || value.cases.length !== EVALUATION_CASES.length)
    return false;
  const seen = new Set<string>();
  const responses = new Set<string>();
  let better = false;
  for (const row of value.cases) {
    if (!row || typeof row !== "object" || !EVALUATION_CASES.includes(row.id) || seen.has(row.id) || !row.structurallyValid || typeof row.responseId !== "string" || !row.responseId.startsWith("resp_") || typeof row.baselineResponseId !== "string" || !row.baselineResponseId.startsWith("resp_") || row.criticalFailures !== 0 || !Number.isFinite(row.specialistScore) || !Number.isFinite(row.baselineScore) || row.specialistScore < .9 || row.specialistScore > 1 || row.baselineScore < 0 || row.baselineScore > 1 || row.specialistScore < row.baselineScore)
      return false;
    if (row.responseId === row.baselineResponseId || responses.has(row.responseId) || responses.has(row.baselineResponseId)) return false;
    responses.add(row.responseId); responses.add(row.baselineResponseId);
    seen.add(row.id);
    better ||= row.specialistScore > row.baselineScore;
  }
  return better;
}
export async function assertSpecialistEvaluated(model: string) {
  const file = process.env.SPECIALIST_EVALUATION_REPORT_PATH;
  if (!file)
    throw new Error("A reviewed specialist evaluation report is required.");
  const raw = await readFile(file, "utf8");
  if (raw.length > 100000 || !validateEvaluationReport(JSON.parse(raw), model, await skillFingerprint()))
    throw new Error("Specialist evaluation report is invalid or stale.");
}
