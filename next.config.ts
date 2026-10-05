import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // The sandbox preview proxies /_next/* from its own host; allow it in dev.
  allowedDevOrigins: ["*.space-z.ai", "localhost"],
};

export default nextConfig;
