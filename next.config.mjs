// @ts-check

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
};

export default nextConfig;
