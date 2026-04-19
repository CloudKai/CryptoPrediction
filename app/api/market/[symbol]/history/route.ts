import { NextResponse } from "next/server";

import { getCandleHistory } from "@/lib/mock/market";
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
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "500", 10);

  const proxied = await maybeProxyRequest(`/api/market/${symbol}/history`, url.searchParams);
  if (proxied) return proxied;

  return NextResponse.json(getCandleHistory(symbol, interval, limit), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
