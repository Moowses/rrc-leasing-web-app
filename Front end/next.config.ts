import type { NextConfig } from "next";

const platformOrigin = (process.env.RRC_PLATFORM_API_ORIGIN || "http://127.0.0.1:4180").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/platform/:path*", destination: `${platformOrigin}/:path*` }];
  },
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default nextConfig;
