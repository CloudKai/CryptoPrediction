import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/allocation": ["./docs/agent-skills/crypto-analysis/**/*.md"],
    "/api/portfolio/review": ["./docs/agent-skills/crypto-analysis/**/*.md"],
  },
};

export default nextConfig;
