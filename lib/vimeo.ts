/**
 * Le lecteur Vimeo, tel que deux écrans s'en servent : le portail
 * d'introduction et la fin de parcours.
 *
 * Le type vit ici parce que TypeScript refuse deux déclarations globales de
 * `window.Vimeo`, même identiques — chaque composant qui redéclarait son
 * propre type cassait la compilation du suivant.
 *
 * Surensemble volontaire : le portail d'introduction a besoin de lire et de
 * repositionner la lecture pour empêcher de sauter la vidéo, la fin de
 * parcours n'a besoin que du format et de la fin. Un type par usage aurait
 * ramené le problème qu'on vient de régler.
 */
export type PlayerVimeo = {
  on: (evt: string, cb: (data: { seconds: number; duration: number }) => void) => void;
  getCurrentTime: () => Promise<number>;
  setCurrentTime: (s: number) => Promise<number>;
  getVideoWidth: () => Promise<number>;
  getVideoHeight: () => Promise<number>;
  ready: () => Promise<void>;
};

declare global {
  interface Window {
    Vimeo?: { Player: new (el: HTMLElement | HTMLIFrameElement) => PlayerVimeo };
  }
}

/** Les vidéos du coach sont tournées au téléphone : on part de la verticale. */
export const FORMAT_VERTICAL = 9 / 16;

/**
 * Charge le SDK du lecteur et rend une fonction de nettoyage.
 *
 * `onEchec` sert au portail d'introduction, qui doit proposer une sortie de
 * secours plutôt que d'enfermer quelqu'un devant un rectangle noir.
 */
export function chargerVimeo(
  onPret: () => void,
  onEchec?: () => void
): () => void {
  const script = document.createElement("script");
  script.src = "https://player.vimeo.com/api/player.js";
  script.async = true;
  script.onload = onPret;
  if (onEchec) script.onerror = onEchec;
  document.body.appendChild(script);
  return () => script.remove();
}
