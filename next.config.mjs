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
  images: {
    domains: [
      "v5.airtableusercontent.com",
      "images.unsplash.com",
      "plus.unsplash.com",
    ],
    unoptimized: true,
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
