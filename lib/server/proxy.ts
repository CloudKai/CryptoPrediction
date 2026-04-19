import { NextResponse } from "next/server";

function buildBackendUrl(pathname: string, searchParams?: URLSearchParams) {
  const base = process.env.BACKEND_API_BASE_URL?.trim();
  if (!base) return null;

  const url = new URL(pathname, base.endsWith("/") ? base : `${base}/`);
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
  } catch (error) {
    return NextResponse.json(
      {
        error: "Backend proxy error",
        message: error instanceof Error ? error.message : "Unknown proxy error",
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
