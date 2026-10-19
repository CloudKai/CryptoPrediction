import { NextResponse } from "next/server";

import { fetchCryptoNews } from "@/lib/server/crypto-news";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "10", 10);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 10) : 10;
  const result = await fetchCryptoNews(safeLimit);

  return NextResponse.json(result, {
    status: result.ok ? 200 : Math.min(Math.max(result.status, 500), 599),
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
