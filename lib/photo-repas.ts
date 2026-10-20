import { lire } from "@/lib/photos-privees";

/**
 * Lecture des photos de repas.
 *
 * Il ne reste que la lecture : depuis que les fichiers vont directement du
 * téléphone au stockage, plus rien ne les dépose depuis le serveur. Le dossier
 * « repas » reste distinct de celui des photos de progression — ces images
 * n'ont ni la même durée de conservation ni les mêmes lecteurs, et les
 * mélanger rendrait impossible de purger les unes sans les autres.
 */
export async function lirePhoto(
  chemin: string
): Promise<{ corps: ReadableStream; type: string } | null> {
  return lire(chemin);
}
