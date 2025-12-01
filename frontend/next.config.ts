import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  trailingSlash: false, // Changed to false to prevent 308 redirects on API routes
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase body size limit to 10MB
    },
  },
};

export default nextConfig;
