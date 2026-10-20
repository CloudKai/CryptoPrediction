import { calculateCurrentPortfolio, type PositionInput } from "@/lib/finance/portfolio";
import { reviewExposure } from "@/lib/finance/risk";
import { specialistReview, evidenceReferences } from "@/lib/analysis/service";
import { authorizedAnalysis, readJson, reply } from "@/lib/analysis/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!authorizedAnalysis(request))
    return reply({ status: "unavailable", message: "Portfolio research requires an authorized analysis client." }, 401);
  let portfolio;
  try {
    const body = await readJson(request) as {
      positions: PositionInput[];
    };
    portfolio = calculateCurrentPortfolio(body.positions);
  }
  catch {
    return reply({ status: "invalid_input" }, 400);
  }
  try {
    const exposure = reviewExposure(portfolio);
    const result = await specialistReview(portfolio.positions.map(position => position.assetId), { portfolio, exposure, valuationBasis: "User-supplied holdings and USD marks, not independently verified." }, request.signal);
    return reply({ status: "complete", generatedAt: new Date().toISOString(), portfolio, exposure, ...result, evidence: evidenceReferences(result.evidence) });
  }
  catch {
    return reply({ status: "incomplete", message: "Dated evidence or specialist output could not be verified. No risk recommendation is available." }, 503);
  }
}
