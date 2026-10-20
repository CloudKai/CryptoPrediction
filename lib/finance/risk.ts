import type { calculatePortfolio } from "./portfolio";
export function reviewExposure(portfolio: ReturnType<typeof calculatePortfolio>) {
  const total = portfolio.currentValueCents;
  return { status: total > 0 ? "measured" : "unavailable", basis: "current USD value, not purchase cost", positions: portfolio.positions.map(position => ({ assetId: position.assetId, currentValueCents: position.currentValueCents, weightPercent: total > 0 ? Math.round(position.currentValueCents / total * 10000) / 100 : null })), largestPositionPercent: total > 0 ? Math.max(...portfolio.positions.map(position => position.currentValueCents)) / total * 100 : null, limitations: ["Asset weights alone do not measure diversification or loss capacity.", "No correlation, liquidity or forward loss bound is implied by these exposure calculations."] };
}
