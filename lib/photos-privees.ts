import { put, get, del } from "@vercel/blob";

/**
 * Dépôt et lecture des photos privées.
 *
 * Deux usages à ce jour — les assiettes et les photos de progression — et le
 * second justifie à lui seul la prudence de l'ensemble : ce sont des hommes
 * torse nu, identifiables, chez eux. Rien de tout cela n'a d'adresse publique.
 * Les fichiers sont déposés en accès privé et servis par des routes qui
 * vérifient la session.
 *
 * Le chemin commence par le dossier d'usage puis l'identifiant du client. Il
 * se lit dans la console de stockage, et permet de retrouver tout ce qui
 * appartient à quelqu'un le jour où il demande la suppression de ses données.
 */

/** Taille au-delà de laquelle on refuse, avant même de téléverser. */
export const TAILLE_MAX = 10 * 1024 * 1024;

export function stockageConfigure(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Dépose un fichier et renvoie son chemin.
 *
 * `prefixe` sépare les usages : « repas », « progression ». Il ne vient jamais
 * de l'extérieur.
 */
export async function deposer(
  prefixe: string,
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
  const chemin = `${prefixe}/${clientId}/${Date.now()}-${alea()}.${extension}`;

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
    console.error("[photos-privees] dépôt impossible", err);
    return { erreur: "Envoi impossible. Réessaie dans un instant." };
  }
}

/** Récupère un fichier pour le servir. `null` s'il n'existe plus. */
export async function lire(
  chemin: string
): Promise<{ corps: ReadableStream; type: string } | null> {
  if (!stockageConfigure()) return null;
  try {
    const resultat = await get(chemin, { access: "private" });
    // `stream` peut être nul alors que l'objet existe : un fichier vide, ou
    // une réponse sans corps. Le traiter comme une absence évite de servir une
    // image cassée avec un code 200.
    if (!resultat?.stream) return null;
    return { corps: resultat.stream, type: resultat.blob.contentType ?? "image/jpeg" };
  } catch (err) {
    console.error("[photos-privees] lecture impossible", err);
    return null;
  }
}

/**
 * Lit un fichier entier en mémoire.
 *
 * Sert à l'analyse des photos de repas : depuis que les fichiers vont
 * directement du téléphone au stockage, le serveur ne les a plus sous la main
 * et doit les relire pour les envoyer au modèle.
 *
 * Réservé aux images. Une vidéo ne doit jamais passer par ici : plusieurs
 * dizaines de mégaoctets en mémoire dans une fonction serveur, c'est la panne
 * assurée.
 */
export async function lireOctets(chemin: string): Promise<Buffer | null> {
  const fichier = await lire(chemin);
  if (!fichier) return null;
  try {
    const morceaux: Uint8Array[] = [];
    const lecteur = fichier.corps.getReader();
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      if (value) morceaux.push(value);
    }
    return Buffer.concat(morceaux);
  } catch (err) {
    console.error("[photos-privees] lecture des octets impossible", err);
    return null;
  }
}

/** Supprime un fichier. Les erreurs sont avalées : la ligne part de toute façon. */
export async function supprimer(chemin: string): Promise<void> {
  if (!stockageConfigure()) return;
  await del(chemin).catch(() => {});
}

function alea(): string {
  return Math.random().toString(36).slice(2, 10);
}
