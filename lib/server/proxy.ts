import { NextResponse } from "next/server";
import { backendApiBaseUrl } from "./backend-config";

function buildBackendUrl(pathname: string, searchParams?: URLSearchParams) {
  const base = backendApiBaseUrl();
  if (!base) return null;

  // Bindings may contain a routing prefix. Resolve relative to that base instead
  // of discarding it with an origin-absolute "/api/..." URL.
  const url = new URL(pathname.replace(/^\/+/, ""), base.endsWith("/") ? base : `${base}/`);
  if (searchParams && searchParams.toString()) {
    url.search = searchParams.toString();
  }
  return url;
}

export async function maybeProxyRequest(pathname: string, searchParams?: URLSearchParams) {
  const targetUrl = buildBackendUrl(pathname, searchParams);
  if (!targetUrl) return null;

  try {
    const backendResponse = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Accept: "application/json",
      },
    });

    const body = await backendResponse.text();
    return new NextResponse(body, {
      status: backendResponse.status,
      headers: {
        "Content-Type": backendResponse.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Backend proxy error",
        message: "The market backend could not be reached. Please try again shortly.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
