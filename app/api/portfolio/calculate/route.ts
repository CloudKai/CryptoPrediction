import { calculateCurrentPortfolio, type PositionInput } from "@/lib/finance/portfolio";
import { reviewExposure } from "@/lib/finance/risk";
import { readJson, reply } from "@/lib/analysis/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await readJson(request) as {
      positions: PositionInput[];
    };
    const result = calculateCurrentPortfolio(body.positions);
    return reply({ ...result, exposure: reviewExposure(result), valuationBasis: "Caller-supplied current values or dated USD marks; no external price verification; no persistence." });
  }
  catch {
    return reply({ status: "invalid_input", message: "Supply valid positions, purchase quantities/costs, and dated USD prices. Sales, transfers and FX are unsupported." }, 400);
  }
}
