import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  // Configure font optimization for Turbopack and external image domains
  images: {
    domains: ['fonts.gstatic.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.gravatar.com',
        port: '',
        pathname: '/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'gravatar.com',
        port: '',
        pathname: '/avatar/**',
      },
    ],
  },
  // Disable static export for API routes
  output: 'standalone',
  // Disable TypeScript type checking during builds
  typescript: {
    ignoreBuildErrors: false, // Keep type checking enabled for safety
  },
};

export default nextConfig;
