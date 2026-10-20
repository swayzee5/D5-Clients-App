import { deposer, lire, supprimer, stockageConfigure, TAILLE_MAX } from "@/lib/photos-privees";

/**
 * Stockage des photos de repas.
 *
 * Délègue à `photos-privees`, le dépôt privé commun aux images sensibles de
 * l'app. Ce fichier garde son propre nom et son propre dossier de stockage :
 * les repas et les photos de progression n'ont ni la même durée de
 * conservation ni les mêmes lecteurs, et les mélanger dans un même dossier
 * rendrait impossible de purger les uns sans les autres.
 */

export { TAILLE_MAX, stockageConfigure };

const DOSSIER = "repas";

export async function deposerPhoto(
  clientId: string,
  fichier: File
): Promise<{ chemin: string } | { erreur: string }> {
  return deposer(DOSSIER, clientId, fichier);
}

export async function lirePhoto(
  chemin: string
): Promise<{ corps: ReadableStream; type: string } | null> {
  return lire(chemin);
}

export async function supprimerPhoto(chemin: string): Promise<void> {
  return supprimer(chemin);
}
