import type { NextConfig } from "next";

const nextConfig: NextConfig = {
//  output: 'export', // Removed to allow API routes for Discord Auth
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
