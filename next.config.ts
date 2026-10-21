import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Optional escape hatch for a damaged local Turbopack persistence cache.
    // Production builds and service bindings do not depend on this setting.
    turbopackFileSystemCacheForDev: process.env.NEXT_DISABLE_TURBOPACK_CACHE !== "1",
  },
  outputFileTracingIncludes: {
    "/api/allocation": ["./docs/agent-skills/crypto-analysis/**/*.md"],
    "/api/portfolio/review": ["./docs/agent-skills/crypto-analysis/**/*.md"],
  },
};

export default nextConfig;
