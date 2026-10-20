import { expect, test } from "vitest";
import { allocateBudget } from "@/lib/finance/allocation";
const weights = [{ assetId: "bitcoin", weightBps: 3333 }, { assetId: "ethereum", weightBps: 3333 }, { assetId: "solana", weightBps: 3334 }];
test("allocates every cent by largest remainder, independent of candidate order", () => {
  expect(allocateBudget(101, weights)).toEqual([
    { assetId: "bitcoin", weightBps: 3333, amountCents: 34 },
    { assetId: "ethereum", weightBps: 3333, amountCents: 33 },
    { assetId: "solana", weightBps: 3334, amountCents: 34 },
  ]);
  expect(allocateBudget(101, [...weights].reverse()).find(x => x.assetId === "bitcoin")?.amountCents).toBe(34);
});
test("refuses incomplete, concentrated, duplicated or unfundable allocations", () => {
  expect(() => allocateBudget(100, [{ assetId: "a", weightBps: 9000 }, { assetId: "b", weightBps: 500 }, { assetId: "c", weightBps: 500 }])).toThrow(/concentration/);
  expect(() => allocateBudget(100, [{ assetId: "a", weightBps: 4000 }, { assetId: "a", weightBps: 3000 }, { assetId: "c", weightBps: 3000 }])).toThrow(/Duplicate/);
  expect(() => allocateBudget(1, weights)).toThrow(/precision/);
  expect(() => allocateBudget(100, weights.map(x => ({ ...x, weightBps: 1000 })))).toThrow(/100%/);
});
test("cent rounding cannot push actual exposure over the concentration cap", () => {
  expect(allocateBudget(101, [{ assetId: "a", weightBps: 5000 }, { assetId: "b", weightBps: 2500 }, { assetId: "c", weightBps: 2500 }]).map(x => x.amountCents)).toEqual([50, 26, 25]);
});
