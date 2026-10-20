import { expect, test } from "vitest";
import { calculatePortfolio } from "@/lib/finance/portfolio";
test("a new purchase changes the denominator without erasing the older lot’s gain", () => {
  const result = calculatePortfolio([{ assetId: "bitcoin", purchases: [
        { id: "old", date: "2020-01-01", quantity: "1", costCents: 10000 },
        { id: "new", date: "2026-01-01", quantity: "0.833333333333333333", costCents: 10000 },
      ], price: { usd: "120", observedAt: "2026-10-20T00:00:00Z" } }]);
  expect(result.currentValueCents).toBe(22000);
  expect(result.gainCents).toBe(2000);
  expect(result.gainPercent).toBe(10);
  expect(result.positions[0].purchases?.[0].gainPercent).toBe(20);
});
test("mixed baseline-only positions never invent historical portfolio gains", () => {
  const result = calculatePortfolio([{ assetId: "bitcoin", currentValueCents: 12000 }, { assetId: "ethereum", currentValueCents: 8000 }]);
  expect(result.currentValueCents).toBe(20000);
  expect(result.gainCents).toBeNull();
  expect(() => calculatePortfolio([{ assetId: "bitcoin", currentValueCents: -1 }])).toThrow();
});
test("a marked value of zero records a complete loss against known purchase cost", () => {
  const result = calculatePortfolio([{ assetId: "failed-token", purchases: [{ id: "lot", date: "2020-01-01", quantity: "1", costCents: 10000 }], price: { usd: "0", observedAt: "2026-10-20T00:00:00Z" } }]);
  expect(result.gainCents).toBe(-10000);
  expect(result.gainPercent).toBe(-100);
});
