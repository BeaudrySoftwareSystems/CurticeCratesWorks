import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes graduated out of `experimental` in Next 15.5.
  typedRoutes: true,
  // Vercel Blob photo URLs need to be allowlisted for next/image. We use plain
  // <img> for now (CSS sizing only — see plan B3); switch to next/image when
  // measured catalog perf demands it.
};

export default nextConfig;
