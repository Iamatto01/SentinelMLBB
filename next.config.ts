import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/SentinelMLBB',
  assetPrefix: '/SentinelMLBB/',
};

export default nextConfig;
