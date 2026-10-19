import { buildMissingBackendStreamMessage, hasFrontendWsUrl } from "@/lib/server/backend-config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasFrontendWsUrl()) {
    return new Response(buildMissingBackendStreamMessage(), {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response("Live stream should connect directly to NEXT_PUBLIC_WS_URL.", {
    status: 501,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
