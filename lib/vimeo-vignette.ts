/**
 * La vignette d'une vidéo Vimeo, sans jeton d'API.
 *
 * oEmbed est public : il suffit que la vidéo soit lisible. On ne s'en sert
 * que pour afficher une image d'aperçu, donc un échec ne casse rien — l'écran
 * retombe sur un dégradé avec un bouton de lecture, ce qui reste cliquable et
 * compréhensible.
 *
 * Mis en cache une journée : une vignette ne change pas, et un appel sortant
 * à chaque ouverture du tableau de bord serait payé par le temps d'affichage
 * de la page.
 */
export async function vignetteVimeo(videoId: string): Promise<string | null> {
  if (!/^\d+$/.test(videoId)) return null;
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F${videoId}&width=1280`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: unknown };
    return typeof data.thumbnail_url === "string" ? data.thumbnail_url : null;
  } catch {
    return null;
  }
}
