import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: PPR (experimental.ppr) has been merged into cacheComponents in Next.js 16
  // However, cacheComponents is not compatible with revalidate route segment configs
  // We'll need to refactor caching strategy before enabling it
};

export default nextConfig;
