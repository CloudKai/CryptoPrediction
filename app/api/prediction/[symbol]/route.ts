import { NextResponse } from "next/server";

import { getLatestPrediction } from "@/lib/mock/market";
import { maybeProxyRequest } from "@/lib/server/proxy";
import { parseInterval } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { symbol } = await context.params;
  const url = new URL(request.url);
  const interval = parseInterval(url.searchParams.get("interval"));

  const proxied = await maybeProxyRequest(`/api/prediction/${symbol}`, url.searchParams);
  if (proxied) return proxied;

  return NextResponse.json(getLatestPrediction(symbol, interval), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
