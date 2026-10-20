import { defineConfig } from "vitest/config";
export default defineConfig({ resolve: { tsconfigPaths: true }, test: { environment: "node", include: ["test/evaluations/*.eval.ts"], testTimeout: 3600000 } });
