import { ANALYSIS_LIMITS } from "@/lib/discover/profile";
const claimSchema = { type: "object", additionalProperties: false, required: ["text", "evidenceIds"], properties: { text: { type: "string" }, evidenceIds: { type: "array", items: { type: "string" } } } };
const explanationSchema = { type: "object", additionalProperties: false, required: ["assets", "portfolioRisk", "limitations"], properties: { assets: { type: "array", items: { type: "object", additionalProperties: false, required: ["assetId", "claims", "risks"], properties: { assetId: { type: "string" }, claims: { type: "array", items: claimSchema }, risks: { type: "array", items: claimSchema } } } }, portfolioRisk: claimSchema, limitations: { type: "array", items: { type: "string" } } } };
/** One counted request, one generation, no tools, hidden conversations, retries, or automatic repair. */
export async function explainEvidence(prompt: {
  instructions: string;
  input: string;
}, config: {
  key: string;
  model: string;
}, signal?: AbortSignal) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${config.key}` };
  const body = { model: config.model, ...prompt, text: { format: { type: "json_schema", name: "crypto_research", strict: true, schema: explanationSchema } } };
  const boundedSignal = AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(45000)]);
  const countResponse = await fetch("https://api.openai.com/v1/responses/input_tokens", { method: "POST", headers, body: JSON.stringify(body), signal: boundedSignal, cache: "no-store" });
  if (!countResponse.ok)
    throw new Error("Token preflight unavailable.");
  const count = await countResponse.json();
  if (!Number.isSafeInteger(count.input_tokens) || count.input_tokens < 0 || count.input_tokens + ANALYSIS_LIMITS.explanationTokens > ANALYSIS_LIMITS.totalTokens)
    throw new Error("Analysis token budget exhausted before generation.");
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers, body: JSON.stringify({ ...body, store: false, max_output_tokens: ANALYSIS_LIMITS.explanationTokens }), signal: boundedSignal, cache: "no-store" });
  if (!response.ok)
    throw new Error("Model unavailable.");
  const result = await response.json();
  const usage = result.usage;
  if (result.status !== "completed" || !usage || ![usage.input_tokens, usage.output_tokens, usage.total_tokens].every(Number.isSafeInteger) || usage.input_tokens < 0 || usage.output_tokens < 0 || usage.total_tokens !== usage.input_tokens + usage.output_tokens || usage.total_tokens > ANALYSIS_LIMITS.totalTokens || usage.output_tokens > ANALYSIS_LIMITS.explanationTokens)
    throw new Error("Analysis incomplete or token usage unverifiable.");
  const messages = (result.output ?? []).filter((item: {
    type: string;
  }) => item.type === "message");
  const content = messages.flatMap((item: {
    content: {
      type: string;
      text?: string;
    }[];
  }) => item.content);
  if (!content.length || content.some((item: {
    type: string;
  }) => item.type !== "output_text"))
    throw new Error("Analysis refused or incomplete.");
  const output = content.map((item: {
    text: string;
  }) => item.text).join("");
  return { responseId: result.id as string, output: JSON.parse(output) as unknown, usage: { totalTokens: usage.total_tokens, explanationTokens: usage.output_tokens } };
}
