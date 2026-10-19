import { NextResponse } from "next/server";

import {
  hasBackendApiBaseUrl,
  missingBackendApiResponse,
} from "@/lib/server/backend-config";
import { maybeProxyRequest } from "@/lib/server/proxy";
import { parseInterval } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { symbol } = await context.params;
  const url = new URL(request.url);
  parseInterval(url.searchParams.get("interval"));
  Number.parseInt(url.searchParams.get("limit") ?? "25", 10);

  if (!hasBackendApiBaseUrl()) {
    return missingBackendApiResponse();
  }

  const proxied = await maybeProxyRequest(
    `/api/prediction/${symbol}/history`,
    url.searchParams,
  );
  if (proxied) return proxied;

  return NextResponse.json(
    {
      error: "No data",
      message: "Backend API proxy is configured but the request failed.",
    },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}
