/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { hostname: "i.vimeocdn.com" },
      { hostname: "player.vimeo.com" },
      { hostname: "raw.githubusercontent.com" },
    ],
  },
  webpack: (config) => {
    config.resolve.alias["pg-native"] = false;
    return config;
  },
};

module.exports = nextConfig;
