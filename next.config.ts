import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // No image domains configured yet — added in Phase 2 when Vercel Blob is wired.
};

export default nextConfig;
