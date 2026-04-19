import { NextResponse } from "next/server";

import { getTrackedCoins } from "@/lib/mock/market";
import { maybeProxyRequest } from "@/lib/server/proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  const proxied = await maybeProxyRequest("/api/coins");
  if (proxied) return proxied;

  return NextResponse.json(
    {
      coins: getTrackedCoins(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
