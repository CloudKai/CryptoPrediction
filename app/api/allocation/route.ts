import { ensureFresh, issue, parseAnalysis } from "@/lib/discover/contract";
import { ANALYSIS_LIMITS, parseInput } from "@/lib/discover/profile";
import { generateAllocation } from "@/lib/analysis/service";
import { allocateBudget } from "@/lib/finance/allocation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  let input;
  try {
    const body = await request.text();
    if (body.length > 12000)
      return reply(issue("invalid_input", "This request is too large. Shorten your preferences and try again.", false), 400);
    input = parseInput(JSON.parse(body));
  }
  catch {
    return reply(issue("invalid_input", "Check the amount and all five profile answers, then try again.", false), 400);
  }
  if (!input)
    return reply(issue("invalid_input", "Check the amount and all five profile answers, then try again.", false), 400);
  if (process.env.SPECIALIST_ANALYSIS_ENABLED === "true") {
    const analysis = await generateAllocation(input, request.signal);
    return reply(ensureFresh(analysis), analysis.status === "complete" ? 200 : 503);
  }
  const endpoint = process.env.ALLOCATION_SERVICE_URL?.trim();
  if (!endpoint)
    return reply(issue("analysis_not_connected", "Allocation analysis is not available yet. Your request is preserved in this tab, so you can edit your inputs or return when analysis is available.", false), 503);
  let url: URL;
  try {
    url = new URL(endpoint);
    if (!((url.protocol === "https:") || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) || url.username || url.password)
      throw new Error();
  }
  catch {
    return reply(issue("service_configuration", "Allocation analysis is temporarily unavailable. Please try again later.", false), 503);
  }
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ...input, limits: ANALYSIS_LIMITS }), cache: "no-store", signal: AbortSignal.any([request.signal, AbortSignal.timeout(60000)]) });
    const raw = await response.text();
    if (raw.length > 100000)
      throw new Error("Invalid service response");
    const analysis = parseAnalysis(JSON.parse(raw), input);
    if (!analysis || (!response.ok && analysis.status === "complete"))
      return reply(issue("invalid_analysis", "The analysis could not be verified. No allocation has been shown. Please try again.", true, "incomplete"), 502);
    if (analysis.status === "complete") {
      const reconciled = allocateBudget(input.budgetCents, analysis.allocations);
      if (reconciled.some((asset, index) => asset.amountCents !== analysis.allocations[index].amountCents)) {
        return reply(issue("allocation_constraints", "The allocation did not satisfy monetary constraints.", true, "incomplete"), 502);
      }
    }
    return reply(ensureFresh(analysis), analysis.status === "complete" ? 200 : 503);
  }
  catch {
    return reply(issue("service_unavailable", "We couldn’t complete the analysis. Your inputs are preserved; please try again.", true), 503);
  }
}
