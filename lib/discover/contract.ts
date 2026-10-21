import { ANALYSIS_LIMITS, type DiscoverInput } from "./profile";
export type Evidence = {
  id?: string;
  title: string;
  url: string;
  observedAt: string;
};
export type SourcedClaim = {
  text: string;
  evidenceIds: string[];
};
export type Allocation = {
  assetId: string;
  name: string;
  symbol: string;
  amountCents: number;
  weightBps: number;
  rationale: string;
  risks: string[];
  evidence: Evidence[];
  claims?: SourcedClaim[];
  riskClaims?: SourcedClaim[];
};
export type CompleteAnalysis = {
  status: "complete";
  analysisId: string;
  generatedAt: string;
  dataAsOf: string;
  marketObservations?: { assetId: string; assetClass: "crypto" | "stock"; observedAt: string }[];
  allocations: Allocation[];
  riskSummary: string;
  riskClaim?: SourcedClaim;
  riskEvidence?: Evidence[];
  limitations: string[];
  methodology: string;
  usage: {
    totalTokens: number;
    explanationTokens: number;
  };
};
export type AnalysisIssue = {
  status: "unavailable" | "incomplete" | "unsupported";
  code: string;
  message: string;
  retryable: boolean;
};
export type AnalysisResponse = CompleteAnalysis | AnalysisIssue;
export const MAX_DATA_AGE_MS = 15 * 60 * 1000;
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown, max = 2000): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
function timestamp(value: unknown): value is string { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)); }
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.length > 0 && value.length <= 12 && value.every((item) => text(item, 1000)); }
function source(value: unknown): value is Evidence {
  if (!object(value) || !text(value.title, 200) || !text(value.url, 2048) || !timestamp(value.observedAt))
    return false;
  if (value.id !== undefined && !text(value.id, 150))
    return false;
  try {
    const url = new URL(value.url);
    return url.protocol === "https:" && !url.username && !url.password;
  }
  catch {
    return false;
  }
}
function cleanSource({ id, title, url, observedAt }: Evidence): Evidence {
  return { ...(id ? { id } : {}), title, url, observedAt };
}
function claims(value: unknown, evidence: Evidence[]): value is SourcedClaim[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 12 && value.every(claim => object(claim) && text(claim.text) && Array.isArray(claim.evidenceIds) && claim.evidenceIds.length > 0 && claim.evidenceIds.length <= 8 && claim.evidenceIds.every(id => typeof id === "string" && evidence.some(source => source.id === id)));
}
function cleanClaims(value: SourcedClaim[]) { return value.map(({ text, evidenceIds }) => ({ text, evidenceIds })); }
export function issue(code: string, message: string, retryable = true, status: AnalysisIssue["status"] = "unavailable"): AnalysisIssue {
  return { status, code, message, retryable };
}
export function parseAnalysis(value: unknown, input: DiscoverInput): AnalysisResponse | null {
  if (!object(value))
    return null;
  if (["unavailable", "incomplete", "unsupported"].includes(String(value.status))) {
    return text(value.code, 100) && text(value.message, 1000) && typeof value.retryable === "boolean"
      ? { status: value.status as AnalysisIssue["status"], code: value.code, message: value.message, retryable: value.retryable } : null;
  }
  if (value.status !== "complete" || !text(value.analysisId, 150) || !timestamp(value.generatedAt) || !timestamp(value.dataAsOf) || !text(value.riskSummary) || !text(value.methodology) || !strings(value.limitations))
    return null;
  if (value.riskClaim !== undefined || value.riskEvidence !== undefined) {
    if (!Array.isArray(value.riskEvidence) || !value.riskEvidence.length || value.riskEvidence.length > 8 || !value.riskEvidence.every(source) || !claims([value.riskClaim], value.riskEvidence) || (value.riskClaim as SourcedClaim).text !== value.riskSummary)
      return null;
  }
  if (!Array.isArray(value.allocations) || value.allocations.length < 1 || value.allocations.length > 5 || !object(value.usage))
    return null;
  const { totalTokens, explanationTokens } = value.usage;
  if (!Number.isSafeInteger(totalTokens) || !Number.isSafeInteger(explanationTokens) || Number(explanationTokens) < 0 || Number(totalTokens) < Number(explanationTokens) || Number(totalTokens) > ANALYSIS_LIMITS.totalTokens || Number(explanationTokens) > ANALYSIS_LIMITS.explanationTokens)
    return null;
  let cents = 0, bps = 0;
  const identities = new Set<string>();
  for (const asset of value.allocations) {
    if (!object(asset) || !text(asset.assetId, 150) || identities.has(asset.assetId) || !text(asset.name, 120) || !text(asset.symbol, 20) || !text(asset.rationale) || !strings(asset.risks) || !Array.isArray(asset.evidence) || asset.evidence.length < 1 || asset.evidence.length > 8 || !asset.evidence.every(source))
      return null;
    if (asset.claims !== undefined && (!claims(asset.claims, asset.evidence) || asset.claims.map(claim => claim.text).join(" ") !== asset.rationale))
      return null;
    if (asset.riskClaims !== undefined && (!claims(asset.riskClaims, asset.evidence) || asset.riskClaims.length !== asset.risks.length || asset.riskClaims.some((claim, index) => claim.text !== (asset.risks as string[])[index])))
      return null;
    if (!Number.isSafeInteger(asset.amountCents) || Number(asset.amountCents) < 1 || !Number.isSafeInteger(asset.weightBps) || Number(asset.weightBps) < 1 || Number(asset.weightBps) > 10000)
      return null;
    const minimum = Math.floor(input.budgetCents * Number(asset.weightBps) / 10000);
    if (Number(asset.amountCents) < minimum || Number(asset.amountCents) > minimum + 1)
      return null;
    cents += Number(asset.amountCents);
    bps += Number(asset.weightBps);
    identities.add(asset.assetId);
    if (cents > input.budgetCents || bps > 10000)
      return null;
  }
  if (cents !== input.budgetCents || bps !== 10000)
    return null;
  const observations = value.marketObservations;
  if (observations !== undefined) {
    if (!Array.isArray(observations) || observations.length !== identities.size || new Set(observations.map(row => row?.assetId)).size !== identities.size || observations.some(row => !object(row) || !identities.has(String(row.assetId)) || !["crypto","stock"].includes(String(row.assetClass)) || !timestamp(row.observedAt) || (row.assetClass === "stock") !== /^stock:(us|sg):[A-Z0-9.\-]+$/.test(String(row.assetId)))) return null;
    const selection = input.assetClass ?? "crypto";
    if (selection === "stocks" && observations.some(row => row.assetClass !== "stock")) return null;
    if (selection === "crypto" && observations.some(row => row.assetClass !== "crypto")) return null;
    if (selection === "both" && !["crypto","stock"].every(kind => observations.some(row => row.assetClass === kind))) return null;
    if (input.stockMarket && input.stockMarket !== "both" && observations.some(row => row.assetClass === "stock" && !row.assetId.startsWith(`stock:${input.stockMarket}:`))) return null;
    if (Math.min(...observations.map(row => Date.parse(row.observedAt))) !== Date.parse(value.dataAsOf)) return null;
  } else if (input.assetClass && input.assetClass !== "crypto") return null;
  return {
    status: "complete", analysisId: value.analysisId, generatedAt: value.generatedAt, dataAsOf: value.dataAsOf,
    riskSummary: value.riskSummary, methodology: value.methodology, limitations: value.limitations,
    ...(observations ? { marketObservations: observations.map(({assetId,assetClass,observedAt}) => ({assetId,assetClass,observedAt})) } : {}),
    ...(value.riskClaim ? { riskClaim: cleanClaims([value.riskClaim as SourcedClaim])[0], riskEvidence: (value.riskEvidence as Evidence[]).map(cleanSource) } : {}),
    allocations: (value.allocations as Allocation[]).map((asset) => ({
      assetId: asset.assetId, name: asset.name, symbol: asset.symbol, amountCents: asset.amountCents, weightBps: asset.weightBps,
      rationale: asset.rationale, risks: asset.risks,
      evidence: asset.evidence.map(cleanSource),
      ...(asset.claims ? { claims: cleanClaims(asset.claims) } : {}),
      ...(asset.riskClaims ? { riskClaims: cleanClaims(asset.riskClaims) } : {}),
    })),
    usage: { totalTokens: totalTokens as number, explanationTokens: explanationTokens as number },
  };
}
export function ensureFresh(analysis: AnalysisResponse, now = Date.now()): AnalysisResponse {
  if (analysis.status !== "complete")
    return analysis;
  const generated = Date.parse(analysis.generatedAt), data = Date.parse(analysis.dataAsOf);
  const staleObservations = analysis.marketObservations?.some(row => {
    const observed = Date.parse(row.observedAt);
    return observed > now+60000 || now-observed > (row.assetClass === "stock" ? 5*86400000 : MAX_DATA_AGE_MS);
  });
  if (data > now + 60000 || generated > now + 60000 || (analysis.marketObservations ? staleObservations : now - data > MAX_DATA_AGE_MS) || now - generated > MAX_DATA_AGE_MS) {
    return issue("stale_evidence", "The market evidence is no longer current enough for a new allocation. Please try again for an updated analysis.", true, "incomplete");
  }
  return analysis;
}
