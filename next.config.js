/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'pg', 'pg-native'],
    // Next met en cache cote client, pendant 30 s par defaut, le contenu des
    // pages deja visitees — y compris celles declarees force-dynamic. Revenir
    // sur la messagerie affichait donc une version perimee : le badge etait a
    // jour, le message pas encore. Ici on veut toujours la derniere version.
    staleTimes: { dynamic: 0, static: 180 },
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
