import { NextResponse } from "next/server";
import { hasBackendApiBaseUrl, missingBackendApiResponse } from "@/lib/server/backend-config";
import { maybeProxyRequest } from "@/lib/server/proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  if (!/^[A-Z0-9]{3,24}$/.test(symbol))
    return NextResponse.json({ error: "Unsupported symbol" }, { status: 400 });
  if (!hasBackendApiBaseUrl()) return missingBackendApiResponse();
  return await maybeProxyRequest(`/api/market/${encodeURIComponent(symbol)}/outlook`)
    ?? NextResponse.json({ error: "Forecast service unavailable" }, { status: 503 });
}
