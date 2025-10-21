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
      // Add CDN domains for future use
      {
        protocol: 'https',
        hostname: 'cdn.promptforge.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Enable modern image formats
    formats: ['image/webp', 'image/avif'],
    // Image optimization
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Disable static export for API routes
  output: 'standalone',
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false, // Keep type checking enabled for safety
  },
  
  // Server external packages (moved from experimental in Next.js 15)
  serverExternalPackages: [
    '@prisma/client',
    'ioredis',
    'winston',
  ],

  // Experimental features for performance
  experimental: {
    // Enable optimizePackageImports for common libraries
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      'date-fns',
      'framer-motion',
    ],

    // Enable scroll restoration
    scrollRestoration: true,

    // Enable large page data
    largePageDataBytes: 128 * 1000, // 128KB

    // Enable webVitalsAttribution
    webVitalsAttribution: ['CLS', 'LCP'],

    // Enable optimizeCss - disabled due to critters dependency issue
    optimizeCss: false,

    // Enable worker threads for compilation
    workerThreads: false, // Disable for now due to compatibility issues
  },
  
  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn', 'info']
    } : false,
    
    // Enable SWC minification
    styledComponents: true,
    
    // Remove React props
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },
  
  // Webpack configuration for additional optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize chunks
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
          chunks: 'all',
        },
        ui: {
          test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
          name: 'ui',
          priority: 20,
          chunks: 'all',
        },
        lib: {
          test: /[\\/]src[\\/]lib[\\/]/,
          name: 'lib',
          priority: 15,
          chunks: 'all',
        },
        hooks: {
          test: /[\\/]src[\\/]hooks[\\/]/,
          name: 'hooks',
          priority: 10,
          chunks: 'all',
        },
      },
    };
    
    // Add bundle analyzer plugin in development
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
    }
    
    // Optimize modules
    config.module.rules.push({
      test: /\.(svg|png|jpe?g|gif|webp|avif)$/i,
      type: 'asset',
      parser: {
        dataUrlCondition: {
          maxSize: 8 * 1024, // 8KB
        },
      },
      generator: {
        filename: 'static/images/[name].[hash][ext]',
      },
    });
    
    // Disable source maps in production
    if (!dev && !isServer) {
      config.devtool = false;
    }
    
    return config;
  },
  
  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
    ];
  },
  
  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Compression
  compress: true,
  
  // Power by header
  poweredByHeader: false,
  
  // Generate ETags
  generateEtags: true,

  // Enable trailing slash
  trailingSlash: false,
};

export default nextConfig;