import type { ResearchEvidence } from "./data";
export type Claim = {
  text: string;
  evidenceIds: string[];
};
export type SpecialistExplanation = {
  assets: {
    assetId: string;
    claims: Claim[];
    risks: Claim[];
  }[];
  portfolioRisk: Claim;
  limitations: string[];
};
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
export function validateExplanation(value: unknown, assetIds: string[], evidence: ResearchEvidence[]): SpecialistExplanation {
  const claim = (raw: unknown, assetId?: string): Claim => {
    if (!object(raw) || typeof raw.text !== "string" || !raw.text.trim() || raw.text.length > 1000 || !Array.isArray(raw.evidenceIds) || !raw.evidenceIds.length || raw.evidenceIds.length > 8 || raw.evidenceIds.some(id => typeof id !== "string" || !evidence.some(source => source.id === id && (!assetId || source.assetId === assetId))))
      throw new Error("Explanation cites invalid evidence.");
    return { text: raw.text, evidenceIds: raw.evidenceIds as string[] };
  };
  if (!object(value) || !Array.isArray(value.assets) || value.assets.length !== assetIds.length || !Array.isArray(value.limitations) || !value.limitations.length || value.limitations.length > 10 || value.limitations.some(x => typeof x !== "string" || !x.trim() || x.length > 1000))
    throw new Error("Invalid specialist explanation.");
  const seen = new Set<string>();
  const assets = value.assets.map(raw => {
    if (!object(raw) || typeof raw.assetId !== "string" || !assetIds.includes(raw.assetId) || seen.has(raw.assetId) || !Array.isArray(raw.claims) || !raw.claims.length || raw.claims.length > 4 || !Array.isArray(raw.risks) || !raw.risks.length || raw.risks.length > 6)
      throw new Error("Invalid asset explanation.");
    seen.add(raw.assetId);
    return { assetId: raw.assetId, claims: raw.claims.map(item => claim(item, raw.assetId as string)), risks: raw.risks.map(item => claim(item, raw.assetId as string)) };
  });
  return { assets, portfolioRisk: claim(value.portfolioRisk), limitations: value.limitations as string[] };
}
