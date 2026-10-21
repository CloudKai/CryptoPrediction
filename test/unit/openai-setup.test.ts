// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { explainEvidence } from "@/lib/analysis/model";
import { specialistConfigurationIssue } from "@/lib/analysis/service";
import { POST } from "@/app/api/allocation/route";
import { validInput } from "../fixtures/discover";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

test("connection failures have a safe actionable code and do not leak transport details", async () => {
  vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("Private transport details")));
  const operation = explainEvidence({instructions:"specialist",input:"evidence"},{key:"test-only",model:"test-model"});
  await expect(operation).rejects.toMatchObject({issue:{code:"openai_connection_failed"}});
  await expect(operation).rejects.not.toThrow("Private transport details");
});

test.each([
  [{status:"incomplete",incomplete_details:{reason:"max_output_tokens"}}, "analysis_output_limit"],
  [{status:"completed",usage:{input_tokens:100,output_tokens:20,total_tokens:120},output:[{type:"message",content:[{type:"refusal",refusal:"Private provider text"}]}]}, "analysis_refused"],
  [{status:"completed",usage:{input_tokens:100,output_tokens:20,total_tokens:999}}, "analysis_usage_invalid"],
])("distinguishes incomplete model output, refusals and unverifiable usage", async (result, code) => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({input_tokens:100})).mockResolvedValueOnce(Response.json(result));
  vi.stubGlobal("fetch",fetcher);
  await expect(explainEvidence({instructions:"specialist",input:"evidence"},{key:"test-only",model:"test-model"})).rejects.toMatchObject({issue:{code}});
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test("identifies a missing OpenAI key and model instead of a generic disconnected state", () => {
  vi.stubEnv("SPECIALIST_ANALYSIS_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("CRYPTO_ANALYSIS_MODEL", "");
  expect(specialistConfigurationIssue()?.code).toBe("openai_not_configured");
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  expect(specialistConfigurationIssue()?.code).toBe("model_not_configured");
  vi.stubEnv("CRYPTO_ANALYSIS_MODEL", "test-model");
  expect(specialistConfigurationIssue()).toBeNull();
});

test("Discover reports the missing OpenAI connection before any provider request", async () => {
  vi.stubEnv("SPECIALIST_ANALYSIS_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("CRYPTO_ANALYSIS_MODEL", "test-model");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const response = await POST(new Request("http://localhost/api/allocation", { method: "POST", body: JSON.stringify(validInput) }));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ status: "unavailable", code: "openai_not_configured" });
  expect(fetcher).not.toHaveBeenCalled();
});

test.each([
  ["", "Discover setup is incomplete: no allocation policy has been configured."],
  ["{}", "Discover setup is incomplete: the configured allocation policy is invalid."],
])("Discover identifies a missing or invalid policy without calling OpenAI", async (policy, message) => {
  vi.stubEnv("SPECIALIST_ANALYSIS_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  vi.stubEnv("CRYPTO_ANALYSIS_MODEL", "test-model");
  vi.stubEnv("ALLOCATION_STRATEGY_JSON", policy);
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const response = await POST(new Request("http://localhost/api/allocation", { method: "POST", body: JSON.stringify(validInput) }));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({
    code: policy ? "strategy_invalid" : "strategy_not_configured",
    message: expect.stringContaining(message),
    retryable: false,
  });
  expect(fetcher).not.toHaveBeenCalled();
});

test.each([
  [401, "invalid_api_key", "openai_authentication"],
  [429, "insufficient_quota", "openai_quota"],
  [429, "rate_limit_exceeded", "openai_rate_limit"],
  [404, "model_not_found", "openai_model_access"],
])("reports safe OpenAI failure codes for HTTP %s", async (status, code, expected) => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ error: { code, message: "Private provider message must never be exposed" } }, { status: Number(status) }));
  vi.stubGlobal("fetch", fetcher);
  try {
    await explainEvidence({ instructions: "specialist", input: "evidence" }, { key: "test-only", model: "test-model" });
    expect.unreachable("OpenAI failure should not generate an allocation");
  } catch (error) {
    expect(error).toMatchObject({ issue: { code: expected } });
    expect(String(error)).not.toContain("Private provider");
  }
  expect(fetcher).toHaveBeenCalledTimes(1);
});
