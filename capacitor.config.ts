import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dayekaba.d5coaching',
  appName: 'D5 Coaching',
  webDir: 'out',
  server: {
    // Pointe vers le serveur Vercel pour garder le SSR
    url: 'https://app.d5coaching-distance.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0D0D0D',
    scrollEnabled: false,
  },
};

export default config;
