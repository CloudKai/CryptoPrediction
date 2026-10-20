export function reply(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
export async function readJson(request: Request, maxBytes = 64000): Promise<unknown> {
  if (!request.body)
    throw new Error("Missing request body.");
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done)
      break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Request exceeds limit.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
/** Deployment credential for expensive research APIs; calculations are stateless and public. */
export function authorizedAnalysis(request: Request) { const token = process.env.ANALYSIS_ACCESS_TOKEN; return !!token && request.headers.get("Authorization") === `Bearer ${token}`; }
