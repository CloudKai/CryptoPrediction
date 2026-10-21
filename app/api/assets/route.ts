import { assetFeed } from "@/lib/assets/feeds";
import type { BrowseMarket, BrowseRange } from "@/lib/assets/types";
import { AnalysisError } from "@/lib/analysis/errors";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const market = params.get("market") ?? "crypto", range = params.get("range") ?? (market === "crypto" ? "24h" : "1mo");
  const headers = { "Cache-Control": "no-store" };
  if (!["crypto","us","sg"].includes(market) || !["24h","7d","1mo","1y"].includes(range)) return Response.json({ message: "Choose a supported market and chart range." }, { status: 400, headers });
  try { return Response.json(await assetFeed(market as BrowseMarket, range as BrowseRange), { headers }); }
  catch (error) { return Response.json({ message: error instanceof AnalysisError ? error.issue.message : "Market data could not be verified. Please try again later." }, { status: 503, headers }); }
}
