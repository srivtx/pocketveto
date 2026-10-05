import type { NextConfig } from "next";

/* NEXT_STATIC=1 → static export for the Android APK (assets/web).
   Default (no env) keeps the normal standalone/dev build. */
const isStaticExport = process.env.NEXT_STATIC === "1";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  images: { unoptimized: isStaticExport },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // The sandbox preview proxies /_next/* from its own host; allow it in dev.
  allowedDevOrigins: ["*.space-z.ai", "localhost"],
};

export default nextConfig;
