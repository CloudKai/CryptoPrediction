import { expect, test } from "vitest";
import { reviewScenarios, simulateJointPaths } from "@/lib/finance/scenarios";
test("portfolio scenarios aggregate joint paths before calculating quantiles", () => {
  const result = simulateJointPaths([[Math.log(2), Math.log(.5)], [Math.log(.5), Math.log(2)]], [10000, 10000], 1, 1, 400, 7);
  expect(result.portfolio).toEqual({ downsideCents: 25000, baseCents: 25000, upsideCents: 25000 });
  expect(result.assets[0].downsideCents).toBe(5000);
  expect(result.assets[1].downsideCents).toBe(5000);
});
test("withholds every horizon without a sufficient dated history", () => {
  const asOf = "2026-10-20T00:00:00Z";
  const history = Array.from({ length: 100 }, (_, i) => ({ date: new Date(Date.parse(asOf) - (99 - i) * 86400000).toISOString().slice(0, 10), prices: [100 + i] }));
  const result = reviewScenarios({ assets: [{ assetId: "bitcoin", currentValueCents: 10000 }], history, asOf }, Date.parse(asOf));
  expect(result.horizons.map(x => x.estimates)).toEqual([null, null, null]);
  expect(() => reviewScenarios({ assets: [{ assetId: "bitcoin", currentValueCents: 10000 }], history: [history[0], history[2]], asOf }, Date.parse(asOf))).toThrow(/contiguous/);
});
test("an unseen price regime fails backtesting rather than displaying unsupported estimates", () => {
  const asOf = "2026-10-20T00:00:00Z", length = 1700;
  const history = Array.from({ length }, (_, i) => ({ date: new Date(Date.parse(asOf) - (length - 1 - i) * 86400000).toISOString().slice(0, 10), prices: [i < 750 ? 100 : 100 * Math.exp(-(i - 750) * .001)] }));
  const result = reviewScenarios({ assets: [{ assetId: "bitcoin", currentValueCents: 10000 }], history, asOf }, Date.parse(asOf));
  expect(result.horizons[0].status).toBe("unavailable");
  expect(result.horizons[0].validation?.folds).toBe(20);
  expect(result.horizons[0].estimates).toBeNull();
});
test("a supported constant-price control validates a no-growth baseline while longer horizons stay unavailable", () => {
  const asOf = "2026-10-20T00:00:00Z", length = 1700;
  const history = Array.from({ length }, (_, i) => ({ date: new Date(Date.parse(asOf) - (length - 1 - i) * 86400000).toISOString().slice(0, 10), prices: [100] }));
  const result = reviewScenarios({ assets: [{ assetId: "control", currentValueCents: 10000 }], history, asOf }, Date.parse(asOf));
  expect(result.horizons[0].estimates?.portfolio).toEqual({ downsideCents: 10000, baseCents: 10000, upsideCents: 10000, baseChangePercent: 0 });
  expect(result.horizons[1].estimates).toBeNull();
  expect(result.horizons[2].estimates).toBeNull();
});
test("each asset must pass validation; stable larger holdings cannot conceal a failing small position", () => {
  const asOf = "2026-10-20T00:00:00Z", length = 1700;
  const history = Array.from({ length }, (_, i) => ({ date: new Date(Date.parse(asOf) - (length - 1 - i) * 86400000).toISOString().slice(0, 10), prices: [100, 100, 100, i < 750 ? 100 : 100 * Math.exp(-(i - 750) * .001)] }));
  const result = reviewScenarios({ assets: [{ assetId: "a", currentValueCents: 100000000 }, { assetId: "b", currentValueCents: 100000000 }, { assetId: "c", currentValueCents: 100000000 }, { assetId: "small", currentValueCents: 10000 }], history, asOf }, Date.parse(asOf));
  expect(result.horizons[0].status).toBe("unavailable");
  expect(result.horizons[0].validation?.series.find(x => x.assetId === "small")?.passed).toBe(false);
});
