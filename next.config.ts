import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    ppr: 'incremental', // Enable Partial Pre-Rendering incrementally
  },
};

export default nextConfig;
