import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase body size limit to 10MB
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
