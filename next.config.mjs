// @ts-check
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // experimental: {
  //   urlImports: ["https://maps.blacksustainability.org/api_data.json"],
  // },
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remove console logs in production only
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.airtableusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dl.airtable.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
    // Optimize images for mobile
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // output: "export",
  // Configure webpack to handle file watching better
  webpack: (config, { dev, isServer }) => {
    // Optimize file watching
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
      ignored: ['**/.git/**', '**/node_modules/**', '**/.next/**']
    }

    // Improve caching in development
    if (dev) {
      config.cache = {
        type: 'filesystem',
        cacheDirectory: resolve(__dirname, '.next/cache/webpack'),
        name: isServer ? 'server' : 'client',
        version: '1.0.0'
      }
    }

    return config
  },
  // Improve path resolution
  experimental: {
    esmExternals: true,
  },
};

export default nextConfig;
