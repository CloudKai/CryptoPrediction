import type { CompleteAnalysis } from "../../lib/discover/contract";
import { draftToInput, type DiscoverDraft } from "../../lib/discover/profile";

// Synthetic fixtures for contract/UI checks only. Never imported by application code.
export const validDraft: DiscoverDraft = { amount: "1,000.00", preferences: "Test request: infrastructure research", horizon: "3_5", capacity: "no", reaction: "hold", experience: "basic", holdings: "none" };
export const validInput = draftToInput(validDraft)!;
export function completeFixture(now = new Date().toISOString()): CompleteAnalysis {
  return {
    status: "complete", analysisId: "synthetic-test-analysis", generatedAt: now, dataAsOf: now,
    allocations: [
      { assetId: "test:bitcoin", name: "Bitcoin", symbol: "BTC", amountCents: 50_000, weightBps: 5_000, rationale: "Synthetic test rationale for the first allocation.", risks: ["Synthetic market risk."], evidence: [{ title: "Bitcoin documentation (test source link)", url: "https://bitcoin.org/en/", observedAt: now }] },
      { assetId: "test:ethereum", name: "Ethereum", symbol: "ETH", amountCents: 30_000, weightBps: 3_000, rationale: "Synthetic test rationale for the second allocation.", risks: ["Synthetic protocol risk."], evidence: [{ title: "Ethereum documentation (test source link)", url: "https://ethereum.org/", observedAt: now }] },
      { assetId: "test:solana", name: "Solana", symbol: "SOL", amountCents: 20_000, weightBps: 2_000, rationale: "Synthetic test rationale for the third allocation.", risks: ["Synthetic liquidity risk."], evidence: [{ title: "Solana documentation (test source link)", url: "https://solana.com/", observedAt: now }] },
    ],
    riskSummary: "Synthetic test risk summary, not investment analysis.", limitations: ["Synthetic test data only."], methodology: "Synthetic contract fixture; no model or market research was run.", usage: { totalTokens: 500, explanationTokens: 100 },
  };
}
