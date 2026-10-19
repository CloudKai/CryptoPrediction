import { NextResponse } from "next/server";

import {
  hasBackendApiBaseUrl,
  missingBackendApiResponse,
} from "@/lib/server/backend-config";
import { maybeProxyRequest } from "@/lib/server/proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasBackendApiBaseUrl()) {
    return missingBackendApiResponse();
  }

  const proxied = await maybeProxyRequest("/api/coins");
  if (proxied) return proxied;

  return NextResponse.json(
    {
      error: "No data",
      message: "Backend API proxy is configured but the request failed.",
    },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}
