import { put, get, del } from "@vercel/blob";

/**
 * Stockage des photos de repas.
 *
 * En accès privé, pas public. Ce sont les assiettes de quelqu'un, donc sa
 * cuisine, sa table, parfois sa famille au second plan. Une adresse publique,
 * même difficile à deviner, reste une adresse qui circule dès qu'on la colle
 * quelque part. Les photos sont servies par une route qui vérifie la session,
 * ce qui coûte un aller-retour de plus et le vaut.
 *
 * Le stockage est facultatif au démarrage : tant que le jeton n'est pas réglé,
 * l'envoi échoue proprement avec un message lisible plutôt qu'une erreur
 * serveur opaque.
 */

/** Taille au-delà de laquelle on refuse, avant même de téléverser. */
export const TAILLE_MAX = 10 * 1024 * 1024;

export function stockageConfigure(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Dépose une photo et renvoie son chemin.
 *
 * Le chemin commence par l'identifiant du client : il rend les fichiers
 * lisibles dans la console de stockage, et permet de tout retrouver pour un
 * client donné le jour où il demande la suppression de ses données.
 */
export async function deposerPhoto(
  clientId: string,
  fichier: File
): Promise<{ chemin: string } | { erreur: string }> {
  if (!stockageConfigure()) {
    return { erreur: "Le stockage des photos n'est pas encore configuré." };
  }
  if (fichier.size > TAILLE_MAX) {
    return { erreur: "Photo trop lourde (10 Mo maximum)." };
  }

  // L'extension vient du type déclaré, jamais du nom du fichier : un nom
  // arrivant du téléphone n'est pas une donnée de confiance.
  const extension = EXTENSIONS[fichier.type] ?? "jpg";
  const chemin = `repas/${clientId}/${Date.now()}-${alea()}.${extension}`;

  try {
    await put(chemin, fichier, {
      access: "private",
      contentType: fichier.type,
      // Le chemin porte déjà un horodatage et un aléa : laisser la
      // bibliothèque en ajouter un rendrait le chemin stocké en base
      // différent de celui demandé.
      addRandomSuffix: false,
    });
    return { chemin };
  } catch (err) {
    console.error("[photo-repas] dépôt impossible", err);
    return { erreur: "Envoi impossible. Réessaie dans un instant." };
  }
}

/** Récupère une photo pour la servir. `null` si elle n'existe plus. */
export async function lirePhoto(
  chemin: string
): Promise<{ corps: ReadableStream; type: string } | null> {
  if (!stockageConfigure()) return null;
  try {
    const resultat = await get(chemin, { access: "private" });
    // `stream` peut être nul alors que l'objet existe : un fichier vide, ou
    // une réponse sans corps. Le traiter comme une absence évite de servir une
    // image cassée avec un code 200.
    if (!resultat?.stream) return null;
    return {
      corps: resultat.stream,
      type: resultat.blob.contentType ?? "image/jpeg",
    };
  } catch (err) {
    console.error("[photo-repas] lecture impossible", err);
    return null;
  }
}

/** Supprime une photo. Les erreurs sont avalées : la ligne part de toute façon. */
export async function supprimerPhoto(chemin: string): Promise<void> {
  if (!stockageConfigure()) return;
  await del(chemin).catch(() => {});
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function alea(): string {
  return Math.random().toString(36).slice(2, 10);
}
