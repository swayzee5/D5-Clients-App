import { pool } from "@/lib/db";

/**
 * Marque qu'un client vient de faire quelque chose dans l'application.
 *
 * La date n'était écrite qu'à la saisie du mot de passe. Or une session reste
 * ouverte des semaines : quelqu'un qui valide ses séances tous les jours sans
 * jamais se reconnecter apparaissait « jamais connecté » côté coach. C'est
 * pourtant le signal sur lequel on décide de relancer — et une fausse alerte
 * de ce genre fait douter de toutes les autres.
 *
 * Appelée depuis les gestes qui comptent : valider une séance, un module,
 * poster un message, enregistrer un bilan. Pas à l'affichage d'une page —
 * ouvrir l'app par réflexe n'est pas une activité, et ce serait des milliers
 * d'écritures pour une information dont la précision utile est la journée.
 *
 * Jamais attendue par l'appelant : si la base est lente ou la colonne
 * absente, le geste du client aboutit quand même. Il ne doit pas patienter
 * pour une statistique de coach.
 */
export function marquerActivite(clientId: string | undefined | null): void {
  if (!clientId) return;

  void pool
    .query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`)
    .then(() =>
      pool.query(`UPDATE clients SET last_login_at = NOW() WHERE id = $1`, [clientId])
    )
    .catch(() => {
      /* Le prochain geste réessaiera. */
    });
}
