import type { NextConfig } from "next";

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
};

export default nextConfig;
