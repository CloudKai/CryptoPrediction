import { cents, changePercent, sumCents } from "./money";
export const SCENARIO_METHOD = "joint-moving-block-v1";
const DAY = 86400000;
const BLOCK = 30, PATHS = 256, FOLDS = 20, STEP = 30, TRAIN = 730;
type Quantiles = {
  downsideCents: number;
  baseCents: number;
  upsideCents: number;
};
export type DailySnapshot = {
  date: string;
  prices: number[];
};
export type ScenarioInput = {
  assets: {
    assetId: string;
    currentValueCents: number;
  }[];
  history: DailySnapshot[];
  asOf: string;
};
function quantiles(values: number[]): Quantiles {
  values.sort((a, b) => a - b);
  const at = (p: number) => {
    const value = Math.round(values[Math.floor((values.length - 1) * p)]);
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error("Scenario exceeds supported precision.");
    return value;
  };
  return { downsideCents: at(.1), baseCents: at(.5), upsideCents: at(.9) };
}
/** Shared block indices retain cross-asset dependence; fixed holdings, no contributions/rebalancing. */
export function simulateJointPaths(returns: number[][], baselines: number[], days: number, blockLength = BLOCK, paths = PATHS, seed = 42) {
  if (!returns.length || !baselines.length || baselines.length > 5 || ![days, blockLength, paths, seed].every(Number.isSafeInteger) || days < 1 || days > 1825 || blockLength < 1 || paths < 1 || paths > 4096 || returns.some(row => row.length !== baselines.length || row.some(x => !Number.isFinite(x))))
    throw new Error("Invalid simulation inputs.");
  baselines.forEach(value => cents(value, false));
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const assets = baselines.map(() => [] as number[]), portfolio: number[] = [];
  for (let path = 0; path < paths; path++) {
    const logs = baselines.map(() => 0);
    let index = 0;
    for (let day = 0; day < days; day++) {
      if (day % blockLength === 0)
        index = Math.floor(random() * returns.length);
      const row = returns[index++ % returns.length];
      for (let asset = 0; asset < logs.length; asset++)
        logs[asset] += row[asset];
    }
    const values = logs.map((log, i) => baselines[i] * Math.exp(log));
    values.forEach((value, i) => assets[i].push(value));
    portfolio.push(values.reduce((sum, value) => sum + value, 0));
  }
  return { assets: assets.map(quantiles), portfolio: quantiles(portfolio) };
}
export function reviewScenarios(input: ScenarioInput, now = Date.now()) {
  if (!input || !Array.isArray(input.assets) || !input.assets.length || input.assets.length > 5 || new Set(input.assets.map(x => x.assetId)).size !== input.assets.length || input.assets.some(x => typeof x.assetId !== "string" || !x.assetId.trim()) || !Array.isArray(input.history) || input.history.length > 10000)
    throw new Error("Invalid scenario portfolio.");
  const baselines = input.assets.map(x => cents(x.currentValueCents, false));
  sumCents(baselines);
  const observed = Date.parse(input.asOf);
  if (!Number.isFinite(observed) || observed > now + 60000 || now - observed > 2 * DAY)
    throw new Error("Scenario data is stale or future-dated.");
  let prior = 0;
  for (const row of input.history) {
    const time = Date.parse(row.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== row.date || (prior && time - prior !== DAY) || time > observed || !Array.isArray(row.prices) || row.prices.length !== baselines.length || row.prices.some(x => !Number.isFinite(x) || x <= 0))
      throw new Error("Require aligned, contiguous positive daily closes without imputation.");
    prior = time;
  }
  if (!prior || observed - prior > 2 * DAY)
    throw new Error("Latest daily close is missing.");
  const returns = input.history.slice(1).map((row, i) => row.prices.map((price, j) => Math.log(price) - Math.log(input.history[i].prices[j])));
  const horizons = ([1, 3, 5] as const).map(years => {
    const days = years * 365;
    if (returns.length < TRAIN + days + (FOLDS - 1) * STEP)
      return { years, status: "unavailable" as const, reason: "insufficient_history", validation: null, estimates: null };
    const diagnostics = [...input.assets.map(asset => asset.assetId), "portfolio"].map(assetId => ({ assetId, hits: 0, error: 0, naiveError: 0 }));
    // Every origin trains strictly before its holdout; overlapping holdouts are disclosed.
    for (let fold = 0; fold < FOLDS; fold++) {
      const origin = returns.length - days - fold * STEP;
      const train = returns.slice(Math.max(0, origin - 1095), origin);
      const predicted = simulateJointPaths(train, baselines, days, BLOCK, PATHS, 42 + fold);
      const growth = baselines.map((baseline, i) => baseline * input.history[origin + days].prices[i] / input.history[origin].prices[i]);
      const actual = [...growth, growth.reduce((a, b) => a + b, 0)];
      const base = [...baselines, baselines.reduce((a, b) => a + b, 0)];
      [...predicted.assets, predicted.portfolio].forEach((prediction, i) => {
        const metric = diagnostics[i];
        if (actual[i] >= prediction.downsideCents && actual[i] <= prediction.upsideCents)
          metric.hits++;
        metric.error += Math.abs(Math.log(Math.max(1, prediction.baseCents) / actual[i]));
        metric.naiveError += Math.abs(Math.log(base[i] / actual[i]));
      });
    }
    const series = diagnostics.map(metric => {
      const coverage = metric.hits / FOLDS, logMae = metric.error / FOLDS, naiveLogMae = metric.naiveError / FOLDS;
      return { assetId: metric.assetId, coverage, logMae, naiveLogMae, passed: coverage >= .7 && logMae <= naiveLogMae * 1.05 + 1e-12 };
    });
    const validation = { folds: FOLDS, series, holdoutsOverlap: true };
    if (series.some(metric => !metric.passed))
      return { years, status: "unavailable" as const, reason: "validation_failed", validation, estimates: null };
    const simulation = simulateJointPaths(returns.slice(-1095), baselines, days);
    const withChange = (values: Quantiles, baseline: number) => ({ ...values, baseChangePercent: changePercent(values.baseCents, baseline) });
    return { years, status: "validated" as const, reason: null, validation, estimates: { assets: simulation.assets.map((values, i) => ({ assetId: input.assets[i].assetId, ...withChange(values, baselines[i]) })), portfolio: withChange(simulation.portfolio, baselines.reduce((a, b) => a + b, 0)) } };
  });
  return { methodology: SCENARIO_METHOD, asOf: input.asOf, horizons, assumptions: ["USD daily closes; 365-day years; 30-day circular blocks; 256 fixed-seed paths; p10/p50/p90 modeled quantiles.", "Buy and hold, unchanged quantities; no future contributions, fees, tax, staking or FX.", "Twenty rolling origins at 30-day spacing; holdouts overlap and are not independent calibration trials.", "Gate: >=70% holdout interval coverage and median log MAE <=105% of no-change baseline; provisional engineering thresholds, not demonstrated investment accuracy.", "Historical regimes may not recur. Survivorship, delistings, liquidity and catastrophic loss are not captured by resampling."] };
}
