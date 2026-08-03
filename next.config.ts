import type { NextConfig } from "next";

const nextConfig: NextConfig = {
//  output: 'export', // Removed to allow API routes for Discord Auth
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['better-sqlite3'],
  async rewrites() {
    return [
      {
        source: '/api/worker/:path*',
        destination: 'https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev/api/:path*',
      },
    ]
  },
};

export default nextConfig;
