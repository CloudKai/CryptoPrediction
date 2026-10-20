import { PROFILE_QUESTIONS, type DiscoverInput } from "@/lib/discover/profile";
import { allocateBudget, type AllocationWeight } from "@/lib/finance/allocation";
import { CATALOG } from "./data";
export type ApprovedStrategy = {
  version: string;
  reviewReference: string;
  weights: AllocationWeight[];
  profiles: Record<string, string[]>;
  preferences: "unsupported";
};
/** Server-owned business configuration. No default coin basket or inferred suitability score. */
export function configuredStrategy(): ApprovedStrategy | null {
  const json = process.env.ALLOCATION_STRATEGY_JSON;
  if (!json)
    return null;
  try {
    const value = JSON.parse(json);
    if (typeof value.version !== "string" || !value.version.trim() || typeof value.reviewReference !== "string" || !value.reviewReference.trim() || value.preferences !== "unsupported" || !value.profiles)
      return null;
    for (const question of PROFILE_QUESTIONS)
      if (!Array.isArray(value.profiles[question.key]) || !value.profiles[question.key].length || value.profiles[question.key].some((option: unknown) => !question.options.some(([id]) => id === option)))
        return null;
    allocateBudget(1000000, value.weights, { minAssets: 3, maxAssets: 5, maxWeightBps: 5000, eligibleAssetIds: CATALOG.map(asset => asset.assetId) });
    return { version: value.version, reviewReference: value.reviewReference, weights: value.weights, profiles: value.profiles, preferences: "unsupported" };
  }
  catch {
    return null;
  }
}
export function supportsProfile(strategy: ApprovedStrategy, input: DiscoverInput) { return !input.preferences.trim() && PROFILE_QUESTIONS.every(question => strategy.profiles[question.key].includes(input.profile[question.key])); }
