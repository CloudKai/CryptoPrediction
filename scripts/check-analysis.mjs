import { createRequire } from "node:module";
import { existsSync } from "node:fs";

// Resolve the env loader through Next's own declared dependency.
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
nextRequire("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

let missing = false;
const check = (name, ok, note = "") => {
  console.log(`${ok ? "OK" : "MISSING"} ${name}${note ? ` — ${note}` : ""}`);
  missing ||= !ok;
};
check("SPECIALIST_ANALYSIS_ENABLED", process.env.SPECIALIST_ANALYSIS_ENABLED === "true");
check("OPENAI_API_KEY", !!process.env.OPENAI_API_KEY?.trim());
check("CRYPTO_ANALYSIS_MODEL", !!process.env.CRYPTO_ANALYSIS_MODEL?.trim());
check("COINGECKO_DEMO_API_KEY", !!process.env.COINGECKO_DEMO_API_KEY?.trim());
if (process.env.DISCOVER_AI_RECOMMENDATIONS_ENABLED === "true") {
  console.log("MODE Discover experimental AI proposals — constrained AI weights; no human evaluation approval claimed.");
} else {
  let strategyJson = false;
  try { strategyJson = !!JSON.parse(process.env.ALLOCATION_STRATEGY_JSON || "null"); } catch { /* Show presence only, never content. */ }
  check("ALLOCATION_STRATEGY_JSON", strategyJson, "requires a reviewed policy; no default basket is supplied");
  const report = process.env.SPECIALIST_EVALUATION_REPORT_PATH?.trim();
  check("SPECIALIST_EVALUATION_REPORT_PATH", !!report && existsSync(report), "requires a real reviewed comparison for this model and skill pack");
}
console.log("Presence checks only. The application validates source freshness, allocation constraints, citations and token usage. The fixed-strategy mode additionally validates its policy and evaluation report.");

if (process.argv.includes("--verify-openai")) {
  if (!process.env.OPENAI_API_KEY?.trim() || !process.env.CRYPTO_ANALYSIS_MODEL?.trim()) {
    console.log("OpenAI verification skipped: add the missing key/model to .env.local.");
    missing = true;
  } else {
    try {
      // Model metadata only: no Responses generation, prompts, user inputs or paid evaluation runs.
      const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(process.env.CRYPTO_ANALYSIS_MODEL.trim())}`, {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY.trim()}` },
        signal: AbortSignal.timeout(15_000), redirect: "error",
      });
      console.log(`OpenAI model access: ${response.ok ? "OK" : `HTTP ${response.status}; check credentials, project permissions and model access`}`);
      missing ||= !response.ok;
    } catch {
      console.log("OpenAI model access: unavailable; check your network and retry.");
      missing = true;
    }
  }
}
process.exitCode = missing ? 1 : 0;
