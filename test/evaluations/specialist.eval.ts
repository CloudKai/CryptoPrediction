/** Explicit opt-in live evaluation. Excluded from ordinary unit tests; can incur provider charges. */
import { test } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { EVALUATION_CASES, skillFingerprint } from "@/lib/analysis/evaluation";
import { explainEvidence } from "@/lib/analysis/model";
import { specialistInstructions } from "@/lib/analysis/service";
import { validateExplanation } from "@/lib/analysis/explanation";
import type { ResearchEvidence } from "@/lib/analysis/data";
test("record live specialist and generic baselines for human factual review", async () => {
  if (process.env.RUN_LIVE_EVALUATION !== "1" || !process.env.OPENAI_API_KEY || !process.env.CRYPTO_ANALYSIS_MODEL || !process.env.SPECIALIST_EVAL_CASES_PATH || !process.env.SPECIALIST_EVAL_OUTPUT_PATH)
    throw new Error("Explicit opt-in, credentials, dated case bundle and output path are required. See docs/FINANCIAL_ENGINE.md.");
  const bundle = JSON.parse(await readFile(process.env.SPECIALIST_EVAL_CASES_PATH, "utf8")) as {
    cases: {
      id: string;
      assetIds: string[];
      calculated: unknown;
      evidence: ResearchEvidence[];
      rubric: string;
    }[];
  };
  if (bundle.cases.length !== EVALUATION_CASES.length || new Set(bundle.cases.map(row => row.id)).size !== EVALUATION_CASES.length || EVALUATION_CASES.some(id => !bundle.cases.some(row => row.id === id)))
    throw new Error("All required distinct evaluation cases must be supplied.");
  const runs = [];
  const config = { key: process.env.OPENAI_API_KEY, model: process.env.CRYPTO_ANALYSIS_MODEL };
  for (const row of bundle.cases) {
    const input = JSON.stringify({ assetIds: row.assetIds, calculated: row.calculated, evidence: row.evidence });
    const pair = [];
    for (const variant of ["specialist", "generic"] as const) {
      const result = await explainEvidence({ instructions: variant === "specialist" ? await specialistInstructions() : "Explain the supplied crypto assets, evidence, holdings or allocation and risks. Return the required schema.", input }, config);
      let structurallyValid = true;
      try {
        validateExplanation(result.output, row.assetIds, row.evidence);
      }
      catch {
        structurallyValid = false;
      }
      pair.push({ variant, ...result, structurallyValid });
    }
    runs.push({ id: row.id, rubric: row.rubric, evidence: row.evidence, runs: pair });
    await writeFile(process.env.SPECIALIST_EVAL_OUTPUT_PATH, JSON.stringify({ status: "requires_human_review", model: config.model, skillSha256: await skillFingerprint(), generatedAt: new Date().toISOString(), runs }, null, 2));
  }
});
