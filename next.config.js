/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "i.vimeocdn.com" },
      { hostname: "player.vimeo.com" },
      { hostname: "raw.githubusercontent.com" },
    ],
  },
}

module.exports = nextConfig
