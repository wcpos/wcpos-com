import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable PPR via cacheComponents (Next.js 16+)
  // With this enabled, all routes are dynamic by default
  // Use 'use cache' directive to opt into caching
  cacheComponents: true,

  // Define cache profiles for use with cacheLife()
  cacheLife: {
    // 5 minute cache for API responses (GitHub releases, etc.)
    'api-short': {
      stale: 300,      // Serve stale for 5 min
      revalidate: 60,  // Start revalidating after 1 min
      expire: 3600,    // Expire after 1 hour
    },
  },
};

export default nextConfig;
