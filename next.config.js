/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'pg', 'pg-native'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pg-native': false,
    };
    return config;
  },
  images: {
    remotePatterns: [
      { hostname: "i.vimeocdn.com" },
      { hostname: "player.vimeo.com" },
      { hostname: "raw.githubusercontent.com" },
    ],
  },
}

module.exports = nextConfig
