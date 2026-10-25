/**
 * De quoi écrire dans le stockage — jeton, ou identité du déploiement.
 *
 * Vercel a changé de modèle : les projets reliés à un store s'authentifient
 * désormais par OIDC, c'est-à-dire par l'identité du déploiement lui-même, et
 * ne reçoivent plus de jeton du tout. Seul `BLOB_STORE_ID` est écrit.
 *
 * Exiger un jeton revenait donc à refuser un stockage parfaitement
 * fonctionnel : c'est ce qui bloquait l'envoi des photos, alors que tout
 * était correctement relié.
 *
 * Quand un store Blob est relié à un projet, Vercel écrit son jeton dans une
 * variable d'environnement — mais pas toujours sous le nom attendu. Selon la
 * façon dont la connexion a été faite, elle peut s'appeler
 * `BLOB_READ_WRITE_TOKEN` ou porter le nom du store en préfixe, par exemple
 * `d5_nutrition_READ_WRITE_TOKEN`. La bibliothèque, elle, ne lit que le
 * premier nom : le jeton est là, et l'envoi échoue quand même, en annonçant
 * un stockage non configuré.
 *
 * On cherche donc toute variable dont le nom finit par `READ_WRITE_TOKEN`, et
 * on passe explicitement le jeton trouvé. Le nom exact ne devrait pas décider
 * si les photos d'un client partent ou non.
 */
export function jetonBlob(): string | undefined {
  const direct = process.env.BLOB_READ_WRITE_TOKEN;
  if (direct) return direct;

  for (const [nom, valeur] of Object.entries(process.env)) {
    if (!valeur) continue;
    // `vercel_blob_rw_…` est le préfixe des jetons Blob : il écarte une
    // variable qui finirait par le même mot sans être un jeton de stockage.
    if (nom.endsWith("READ_WRITE_TOKEN") && valeur.startsWith("vercel_blob_rw_")) {
      return valeur;
    }
  }
  return undefined;
}

/** Le nom de la variable retenue, pour les diagnostics. Jamais sa valeur. */
export function nomVariableBlob(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "BLOB_READ_WRITE_TOKEN";
  for (const [nom, valeur] of Object.entries(process.env)) {
    if (!valeur) continue;
    if (nom.endsWith("READ_WRITE_TOKEN") && valeur.startsWith("vercel_blob_rw_")) return nom;
  }
  return undefined;
}

/**
 * Le stockage est-il utilisable ?
 *
 * Deux façons valables, et il suffit de l'une : un jeton de lecture-écriture,
 * ou l'identité du déploiement avec l'identifiant du store. La bibliothèque
 * choisit elle-même, à condition qu'on la laisse faire.
 */
export function stockageUtilisable(): boolean {
  return Boolean(jetonBlob() || process.env.BLOB_STORE_ID);
}

/** Comment on s'authentifie, pour les diagnostics. */
export function modeBlob(): string {
  if (jetonBlob()) return `jeton (${nomVariableBlob()})`;
  if (process.env.BLOB_STORE_ID) {
    return process.env.VERCEL_OIDC_TOKEN
      ? "OIDC (identité du déploiement) + BLOB_STORE_ID"
      : "BLOB_STORE_ID présent, mais aucun jeton OIDC dans ce contexte";
  }
  return "aucun";
}

/**
 * Le store privé, réservé aux photos.
 *
 * Un store Vercel est public ou privé, et ça se décide à sa création : on ne
 * bascule pas l'un en l'autre. Le store historique est public — c'est très
 * bien pour les plans alimentaires, dont le lien est de toute façon donné au
 * client. Ce ne l'est pas pour des photos de repas et de corps : un lien
 * public reste lisible par quiconque le reçoit, et ces images-là sont les
 * données les plus sensibles de tout le système.
 *
 * Les deux coexistent donc, et chaque dépôt dit explicitement dans lequel il
 * va. Sans store privé configuré, on refuse plutôt que de déposer en public :
 * un repli silencieux rendrait publiques des photos que personne n'a accepté
 * de rendre publiques.
 */
export function storeIdPrive(): string | undefined {
  return (
    process.env.PHOTOS_BLOB_STORE_ID ||
    process.env.PRIVE_BLOB_STORE_ID ||
    undefined
  );
}

/**
 * Le jeton du store privé.
 *
 * L'envoi depuis le téléphone passe par `handleUpload`, qui ne sait
 * s'authentifier que par jeton — il n'accepte pas d'identifiant de store. Le
 * store privé doit donc fournir le sien, sous un nom distinct de celui du
 * store public, sans quoi les deux seraient confondus.
 */
export function jetonPrive(): string | undefined {
  return (
    process.env.PHOTOS_BLOB_READ_WRITE_TOKEN ||
    process.env.PRIVE_BLOB_READ_WRITE_TOKEN ||
    undefined
  );
}

/** Les options de dépôt pour une photo privée. */
export function optionsPrivees(): { token?: string; storeId?: string } {
  return { token: jetonPrive() ?? jetonBlob(), storeId: storeIdPrive() };
}

/** Le stockage privé est-il utilisable ? */
export function priveUtilisable(): boolean {
  return Boolean(jetonPrive() || storeIdPrive());
}
