import { cents, safeNumber } from "./money";
import { MAX_BUDGET_CENTS } from "@/lib/discover/profile";
export type AllocationWeight = {
  assetId: string;
  weightBps: number;
};
export type AllocationPolicy = {
  minAssets: number;
  maxAssets: number;
  maxWeightBps: number;
  eligibleAssetIds?: readonly string[];
};
export const DEFAULT_ALLOCATION_POLICY: AllocationPolicy = { minAssets: 3, maxAssets: 5, maxWeightBps: 5000 };
/** Weights are policy inputs, not AI-generated arithmetic. Stable IDs break remainder ties. */
export function allocateBudget(budgetCents: number, weights: AllocationWeight[], policy: AllocationPolicy = DEFAULT_ALLOCATION_POLICY) {
  cents(budgetCents, false);
  if (budgetCents > MAX_BUDGET_CENTS)
    throw new Error("Budget exceeds the supported limit.");
  if (![policy.minAssets, policy.maxAssets, policy.maxWeightBps].every(Number.isSafeInteger) || policy.minAssets < 1 || policy.maxAssets > 5 || policy.minAssets > policy.maxAssets || policy.maxWeightBps < 1 || policy.maxWeightBps > 10000)
    throw new Error("Invalid allocation policy.");
  if (!Array.isArray(weights) || weights.length < policy.minAssets || weights.length > policy.maxAssets)
    throw new Error("Unsupported asset count.");
  const ids = new Set<string>();
  let total = 0;
  const rows = weights.map((item) => {
    if (!item || typeof item.assetId !== "string" || !item.assetId.trim() || item.assetId.length > 150 || ids.has(item.assetId) || (policy.eligibleAssetIds && !policy.eligibleAssetIds.includes(item.assetId)))
      throw new Error("Duplicate or ineligible asset.");
    ids.add(item.assetId);
    if (!Number.isSafeInteger(item.weightBps) || item.weightBps < 1 || item.weightBps > policy.maxWeightBps)
      throw new Error("Allocation exceeds concentration constraints.");
    total += item.weightBps;
    const product = BigInt(budgetCents) * BigInt(item.weightBps);
    return { ...item, amountCents: safeNumber(product / BigInt(10000)), remainder: product % BigInt(10000) };
  });
  if (total !== 10000)
    throw new Error("Weights must total 100%.");
  let remaining = budgetCents - rows.reduce((sum, item) => sum + item.amountCents, 0);
  const ranked = [...rows].sort((a, b) => a.remainder === b.remainder ? (a.assetId < b.assetId ? -1 : 1) : a.remainder > b.remainder ? -1 : 1);
  const maximumCents = safeNumber(BigInt(budgetCents) * BigInt(policy.maxWeightBps) / BigInt(10000));
  for (const item of ranked) {
    if (remaining > 0 && item.amountCents < maximumCents) {
      item.amountCents++;
      remaining--;
    }
  }
  if (remaining > 0)
    throw new Error("Concentration constraints cannot be met at cent precision.");
  if (rows.some(item => item.amountCents === 0))
    throw new Error("Budget cannot fund every selected asset to cent precision.");
  return rows.map(({ assetId, weightBps, amountCents }) => ({ assetId, weightBps, amountCents }));
}
