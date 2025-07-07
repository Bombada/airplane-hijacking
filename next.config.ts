import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Skip build-time type checking (we'll do it separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 이미지 최적화 설정
  images: {
    unoptimized: true,
  },
  
  // External packages configuration (moved from experimental in Next.js 15)
  serverExternalPackages: ["ws"],
  
  // Webpack 설정으로 path mapping 강화
  webpack: (config, { isServer }) => {
    // Alias 설정
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    
    return config;
  },
};

export default nextConfig;
