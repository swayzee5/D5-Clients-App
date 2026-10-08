import { pool } from "@/lib/db";
import { computeScores, type Ratings, type Scores } from "@/lib/reboot-diagnostic";

/**
 * Le bilan de fin de challenge.
 *
 * Les six mêmes notes qu'au départ, refaites au septième jour. L'écart est la
 * seule chose que le challenge produise de vraiment précieux : « parti de 42,
 * arrivé à 58 » est une phrase qu'aucun argumentaire ne remplace, ni pour le
 * participant ni pour le coach.
 *
 * D'où une table séparée du diagnostic de départ, et non une mise à jour. Le
 * diagnostic est enregistré une fois par personne, sans doublon possible :
 * écraser les notes de départ ferait disparaître le point de comparaison, et
 * avec lui tout l'intérêt de l'exercice.
 */

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reboot_bilans (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      ratings             JSONB NOT NULL,
      score_global        INT NOT NULL,
      score_sommeil       INT NOT NULL,
      score_energie       INT NOT NULL,
      score_recuperation  INT NOT NULL,
      score_stress        INT NOT NULL,
      score_motivation    INT NOT NULL,
      score_confiance     INT NOT NULL,
      /** Note de satisfaction sur 5. */
      satisfaction        INT,
      temoignage          TEXT,
      /**
       * Autorisation explicite de publier le témoignage.
       *
       * Sans accord écrit au moment où la personne l'écrit, la phrase est
       * inutilisable : demander après coup est bien plus difficile, et publier
       * sans demander n'est pas une option.
       */
      temoignage_publiable BOOLEAN NOT NULL DEFAULT false,
      submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id)
    )
  `);
}

export type Bilan = {
  scores: Scores;
  satisfaction: number | null;
  temoignage: string | null;
  temoignagePubliable: boolean;
  submittedAt: Date;
};

/** Le bilan d'un participant, s'il l'a rempli. */
export async function getBilan(clientId: string): Promise<Bilan | null> {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT score_global, score_sommeil, score_energie, score_recuperation,
              score_stress, score_motivation, score_confiance,
              satisfaction, temoignage, temoignage_publiable, submitted_at
       FROM reboot_bilans WHERE client_id = $1`,
      [clientId]
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      scores: {
        global: r.score_global,
        sommeil: r.score_sommeil,
        energie: r.score_energie,
        recuperation: r.score_recuperation,
        stress: r.score_stress,
        motivation: r.score_motivation,
        confiance: r.score_confiance,
      },
      satisfaction: r.satisfaction,
      temoignage: r.temoignage,
      temoignagePubliable: r.temoignage_publiable,
      submittedAt: r.submitted_at,
    };
  } catch (err) {
    console.error("[reboot-bilan] lecture impossible", err);
    return null;
  }
}

/** Enregistre le bilan. Idempotent : une seconde validation ne duplique rien. */
export async function saveBilan(
  clientId: string,
  ratings: Ratings,
  satisfaction: number | null,
  temoignage: string | null,
  temoignagePubliable: boolean
): Promise<Scores> {
  await ensureTable();
  const scores = computeScores(ratings);
  await pool.query(
    `INSERT INTO reboot_bilans (
       client_id, ratings, score_global, score_sommeil, score_energie,
       score_recuperation, score_stress, score_motivation, score_confiance,
       satisfaction, temoignage, temoignage_publiable
     )
     VALUES ($1,$2::jsonb,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (client_id) DO NOTHING`,
    [
      clientId,
      JSON.stringify(ratings),
      scores.global,
      scores.sommeil,
      scores.energie,
      scores.recuperation,
      scores.stress,
      scores.motivation,
      scores.confiance,
      satisfaction,
      temoignage,
      temoignagePubliable,
    ]
  );
  return scores;
}
