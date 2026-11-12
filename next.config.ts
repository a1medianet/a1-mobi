import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig: NextConfig = {
  distDir: process.env.A1_MOBI_DIST_DIR || ".next",
  env: { A1_MOBI_C_LIVE_01_ENABLED: process.env.A1_MOBI_C_LIVE_01_ENABLED ?? "1" },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    cpus: 1,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
