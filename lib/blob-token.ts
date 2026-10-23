/**
 * Le jeton du stockage, quel que soit le nom qu'il porte.
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
