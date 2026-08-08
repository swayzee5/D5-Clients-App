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
    // 'never' : on gère nous-mêmes les safe areas en CSS (env(safe-area-inset-*)),
    // sinon iOS ajoute un inset automatique qui se cumule avec notre padding.
    contentInset: 'never',
    backgroundColor: '#0D0D0D',
    // ÉTAIT À false — cela désactivait littéralement le scroll de la WKWebView
    // (webView.scrollView.isScrollEnabled = false). Aucun CSS ne peut contourner ça.
    scrollEnabled: true,
  },
};

export default config;
