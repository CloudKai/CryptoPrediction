import { ANALYSIS_LIMITS } from "@/lib/discover/profile";
import { issue } from "@/lib/discover/contract";
import { AnalysisError } from "./errors";

async function providerFailure(response: Response): Promise<AnalysisError> {
  let code: unknown;
  try { code = (await response.json())?.error?.code; } catch { /* Never forward provider error text. */ }
  if (response.status === 401)
    return new AnalysisError(issue("openai_authentication", "OpenAI rejected the configured API credentials. The connection needs attention.", false));
  if (response.status === 429 && code === "insufficient_quota")
    return new AnalysisError(issue("openai_quota", "The OpenAI account has no available API quota. Analysis will resume when its billing or limits are updated.", false));
  if (response.status === 429)
    return new AnalysisError(issue("openai_rate_limit", "OpenAI is temporarily rate-limited. Please try again shortly.", true));
  if (response.status === 403 || response.status === 404)
    return new AnalysisError(issue("openai_model_access", "The configured OpenAI model is not available to this application.", false));
  return new AnalysisError(issue("openai_unavailable", "OpenAI could not complete this analysis. Please try again later.", response.status >= 500));
}
const claimSchema = { type: "object", additionalProperties: false, required: ["text", "evidenceIds"], properties: { text: { type: "string" }, evidenceIds: { type: "array", items: { type: "string" } } } };
const explanationSchema = { type: "object", additionalProperties: false, required: ["assets", "portfolioRisk", "limitations"], properties: { assets: { type: "array", items: { type: "object", additionalProperties: false, required: ["assetId", "claims", "risks"], properties: { assetId: { type: "string" }, claims: { type: "array", items: claimSchema }, risks: { type: "array", items: claimSchema } } } }, portfolioRisk: claimSchema, limitations: { type: "array", items: { type: "string" } } } };
const recommendationSchema = (assetIds: string[], evidenceIds: string[]) => {
  const conciseClaim = { ...claimSchema, properties: {
    text: {type:"string",minLength:1,maxLength:220},
    evidenceIds: {type:"array",minItems:1,maxItems:2,items:evidenceIds.length ? {type:"string",enum:evidenceIds} : {type:"string"}},
  } };
  return ({
  ...explanationSchema,
  $defs: { citedClaim: conciseClaim },
  required: [...explanationSchema.required, "weights", "unsupportedReason"],
  properties: {
    ...explanationSchema.properties,
    assets: {type:"array",maxItems:5,items:{type:"object",additionalProperties:false,required:["assetId","claims","risks"],properties:{
      assetId:{type:"string",enum:assetIds},
      claims:{type:"array",minItems:1,maxItems:1,items:{$ref:"#/$defs/citedClaim"}},
      risks:{type:"array",minItems:1,maxItems:1,items:{$ref:"#/$defs/citedClaim"}},
    }}},
    portfolioRisk: {$ref:"#/$defs/citedClaim"},
    limitations:{type:"array",minItems:2,maxItems:4,items:{type:"string",minLength:1,maxLength:160}},
    unsupportedReason: { type: ["string", "null"] },
    weights: { type: "array", maxItems:5, items: { type: "object", additionalProperties: false, required: ["assetId", "weightBps"], properties: {
      assetId: { type: "string", enum: assetIds },
      weightBps: { type: "integer", minimum: 1, maximum: 5000 },
    } } },
  },
});
};
export function recommendEvidence(prompt: { instructions: string; input: string }, config: { key: string; model: string }, signal?: AbortSignal, assetIds = ["bitcoin","ethereum","solana"], evidenceIds: string[] = []) {
  return explainEvidence(prompt, config, signal, recommendationSchema(assetIds,evidenceIds));
}
/** One counted request, one generation, no tools, hidden conversations, retries, or automatic repair. */
export async function explainEvidence(prompt: {
  instructions: string;
  input: string;
}, config: {
  key: string;
  model: string;
}, signal?: AbortSignal, schema: object = explanationSchema) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${config.key}` };
  const body = { model: config.model, ...prompt, text: { format: { type: "json_schema", name: "crypto_research", strict: true, schema } } };
  const boundedSignal = AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(45000)]);
  const post = async (path: string, payload: object) => {
    try {
      const response = await fetch(`https://api.openai.com/v1/responses${path}`, {method:"POST",headers,body:JSON.stringify(payload),signal:boundedSignal,cache:"no-store"});
      if (!response.ok) throw await providerFailure(response);
      try { return await response.json(); }
      catch { throw new AnalysisError(issue("analysis_provider_response_invalid","OpenAI returned an unreadable provider response. Please try again shortly.",true,"incomplete")); }
    } catch (error) {
      signal?.throwIfAborted();
      if (error instanceof AnalysisError) throw error;
      throw new AnalysisError(issue(boundedSignal.aborted ? "openai_timed_out" : "openai_connection_failed",boundedSignal.aborted ? "OpenAI took too long to finish the analysis. Your inputs are preserved; please try again." : "The server could not connect to OpenAI. Please try again shortly.",true,"incomplete"));
    }
  };
  const count = await post("/input_tokens",body);
  if (!Number.isSafeInteger(count.input_tokens) || count.input_tokens < 0 || count.input_tokens + ANALYSIS_LIMITS.explanationTokens > ANALYSIS_LIMITS.totalTokens)
    throw new AnalysisError(issue("analysis_token_limit", "The analysis exceeded its token budget. No allocation is shown. Try selecting fewer stock markets.", false, "incomplete"));
  const result = await post("",{...body,store:false,max_output_tokens:ANALYSIS_LIMITS.explanationTokens});
  const usage = result.usage;
  if (result.status === "incomplete" && result.incomplete_details?.reason === "max_output_tokens")
    throw new AnalysisError(issue("analysis_output_limit","OpenAI reached the response token limit before finishing the analysis. No allocation is shown. Please try again.",true,"incomplete"));
  if (result.status !== "completed")
    throw new AnalysisError(issue("analysis_model_incomplete","OpenAI did not finish this analysis. No allocation is shown. Please try again.",true,"incomplete"));
  if (!usage || ![usage.input_tokens, usage.output_tokens, usage.total_tokens].every(Number.isSafeInteger) || usage.input_tokens < 0 || usage.output_tokens < 0 || usage.total_tokens !== usage.input_tokens + usage.output_tokens || usage.total_tokens > ANALYSIS_LIMITS.totalTokens || usage.output_tokens > ANALYSIS_LIMITS.explanationTokens)
    throw new AnalysisError(issue("analysis_usage_invalid","The AI response token usage could not be verified within the budget. No allocation is shown.",true,"incomplete"));
  const messages = (result.output ?? []).filter((item: {
    type: string;
  }) => item.type === "message");
  const content = messages.flatMap((item: {
    content: {
      type: string;
      text?: string;
    }[];
  }) => item.content);
  if (content.some((item: {type:string}) => item.type === "refusal"))
    throw new AnalysisError(issue("analysis_refused","OpenAI declined this analysis request. No allocation is shown. Review your preferences before trying again.",false,"incomplete"));
  if (!content.length || content.some((item: {
    type: string;
  }) => item.type !== "output_text"))
    throw new AnalysisError(issue("analysis_output_invalid","OpenAI returned no usable structured analysis. No allocation is shown. Please try again.",true,"incomplete"));
  const output = content.map((item: {
    text: string;
  }) => item.text).join("");
  let parsed: unknown;
  try { parsed = JSON.parse(output); }
  catch { throw new AnalysisError(issue("analysis_output_invalid","OpenAI returned an unreadable analysis. No allocation is shown. Please try again.",true,"incomplete")); }
  return { responseId: result.id as string, output: parsed, usage: { totalTokens: usage.total_tokens, explanationTokens: usage.output_tokens } };
}
