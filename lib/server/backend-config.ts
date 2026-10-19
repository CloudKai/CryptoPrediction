import { NextResponse } from "next/server";

const FRONTEND_ENV_FILE = ".env.local";
const BACKEND_ENTRYPOINT = "backend/app/main.py";

export function hasBackendApiBaseUrl() {
  return Boolean(process.env.BACKEND_API_BASE_URL?.trim());
}

export function hasFrontendWsUrl() {
  return Boolean(process.env.NEXT_PUBLIC_WS_URL?.trim());
}

export function buildMissingBackendApiMessage() {
  return [
    "No data: backend REST API is not configured.",
    `Add BACKEND_API_BASE_URL=http://localhost:8000 to ${FRONTEND_ENV_FILE}.`,
    `Run the Python backend from ${BACKEND_ENTRYPOINT}.`,
    "Optional: add NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/market to enable live streaming.",
  ].join("\n");
}

export function buildMissingBackendStreamMessage() {
  return [
    "Live stream is not configured.",
    `Add NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/market to ${FRONTEND_ENV_FILE}.`,
    `Run the Python backend from ${BACKEND_ENTRYPOINT}.`,
  ].join("\n");
}

export function missingBackendApiResponse() {
  return NextResponse.json(
    {
      error: "No data",
      message: buildMissingBackendApiMessage(),
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
