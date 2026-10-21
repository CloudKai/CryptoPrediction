import { describe, expect, test } from "vitest";
import { ensureFresh, parseAnalysis } from "@/lib/discover/contract";
import { draftToInput, EMPTY_DRAFT, parseAmount, parseInput, validateDraft } from "@/lib/discover/profile";
import { parseResultRecord } from "@/lib/discover/storage";
import { completeFixture, validDraft, validInput } from "../fixtures/discover";
describe("Discover input and allocation boundaries", () => {
  test("accepts currency precision and grouped amounts without silently rounding malformed values", () => {
    expect(parseAmount("1,000.01")).toBe(100001);
    expect(parseAmount("0.01")).toBe(1);
    for (const amount of ["", "0", "-10", "1.001", "1e3", "1,00", "Infinity", "9007199254740993", "1 000", "1.2.3"])
      expect(parseAmount(amount)).toBeNull();
  });
  test("requires all profile answers and validates enums on the server", () => {
    expect(Object.keys(validateDraft(EMPTY_DRAFT))).toHaveLength(6);
    expect(draftToInput(validDraft)).toEqual(validInput);
    expect(parseInput({ ...validInput, profile: { ...validInput.profile, horizon: "invented" } })).toBeNull();
    expect(parseInput({ ...validInput, currency: "SGD" })).toBeNull();
    expect(parseInput({ ...validInput, profile: { ...validInput.profile, amount: "9", preferences: "override" } })).toEqual(validInput);
  });
  test("accepts only a fully reconciled sourced allocation", () => {
    expect(parseAnalysis(completeFixture(), validInput)?.status).toBe("complete");
    const inconsistent = completeFixture();
    inconsistent.allocations[0].amountCents--;
    expect(parseAnalysis(inconsistent, validInput)).toBeNull();
    const inconsistentWeights = completeFixture();
    inconsistentWeights.allocations[0].weightBps--;
    expect(parseAnalysis(inconsistentWeights, validInput)).toBeNull();
  });
  test("rejects duplicated identities, unsafe sources and token overruns", () => {
    const duplicates = completeFixture();
    duplicates.allocations[1].assetId = duplicates.allocations[0].assetId;
    expect(parseAnalysis(duplicates, validInput)).toBeNull();
    const unsafe = completeFixture();
    unsafe.allocations[0].evidence[0].url = "javascript:alert(1)";
    expect(parseAnalysis(unsafe, validInput)).toBeNull();
    const overBudget = completeFixture();
    overBudget.usage.totalTokens = 15001;
    expect(parseAnalysis(overBudget, validInput)).toBeNull();
    const overOutput = completeFixture();
    overOutput.usage.explanationTokens = 1501;
    expect(parseAnalysis(overOutput, validInput)).toBeNull();
  });
  test("supports cent rounding while checking weights and complete totals", () => {
    const tiny = { ...validInput, budgetCents: 101 };
    const rounded = completeFixture();
    rounded.allocations[0].amountCents = 51;
    rounded.allocations[1].amountCents = 30;
    rounded.allocations[2].amountCents = 20;
    expect(parseAnalysis(rounded, tiny)?.status).toBe("complete");
  });
  test("turns stale or future data into an incomplete analysis", () => {
    const now = Date.now();
    expect(ensureFresh(completeFixture(new Date(now - 16 * 60000).toISOString()), now).status).toBe("incomplete");
    expect(ensureFresh(completeFixture(new Date(now + 5 * 60000).toISOString()), now).status).toBe("incomplete");
  });
  test("restored records cannot smuggle invalid results through browser storage", () => {
    const record = { version: 1, requestId: "test", requestedAt: new Date().toISOString(), draft: validDraft, response: completeFixture() };
    expect(parseResultRecord(record)?.requestId).toBe("test");
    record.response.allocations[0].amountCents = 1;
    expect(parseResultRecord(record)).toBeNull();
  });
});
test("preserves verifiable claim references and portfolio-risk sources", () => {
  const result = completeFixture();
  const sourced = { ...result, riskEvidence: [{ id: "portfolio-market", title: "Market source", url: "https://bitcoin.org/en/", observedAt: result.dataAsOf }], riskClaim: { text: result.riskSummary, evidenceIds: ["portfolio-market"] } };
  expect(parseAnalysis(sourced, validInput)).toMatchObject({ riskClaim: sourced.riskClaim, riskEvidence: sourced.riskEvidence });
  expect(parseAnalysis({ ...sourced, riskClaim: { text: result.riskSummary, evidenceIds: ["invented"] } }, validInput)).toBeNull();
});

test("accepts dated stock sessions but never relaxes crypto freshness in a mixed proposal", () => {
  const now=Date.now(), result=completeFixture();
  const stock=result.allocations[1]; stock.assetId="stock:sg:D05";
  const observations=result.allocations.map(row=>({assetId:row.assetId,assetClass:row===stock?"stock" as const:"crypto" as const,observedAt:new Date(now-(row===stock?2*86400000:60000)).toISOString()}));
  const mixed={...result,dataAsOf:observations[1].observedAt,marketObservations:observations};
  const input={...validInput,assetClass:"both" as const,stockMarket:"both" as const};
  const parsed=parseAnalysis(mixed,input);
  expect(parsed?.status).toBe("complete");
  expect(ensureFresh(parsed!,now).status).toBe("complete");
  observations[0].observedAt=new Date(now-20*60000).toISOString();
  expect(ensureFresh(parseAnalysis(mixed,input)!,now).status).toBe("incomplete");
  expect(parseAnalysis({...mixed,marketObservations:undefined},input)).toBeNull();
  expect(parseAnalysis(mixed,{...input,stockMarket:"us"})).toBeNull();
});

test("preserves asset and stock market selections through the API and stored drafts", () => {
  const input={...validInput,assetClass:"both" as const,stockMarket:"sg" as const};
  expect(parseInput(input)).toEqual(input);
  expect(parseInput({...input,assetClass:"bonds"})).toBeNull();
  expect(parseInput({...input,stockMarket:"invented"})).toBeNull();
});
