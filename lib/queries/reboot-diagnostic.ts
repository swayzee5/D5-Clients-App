import { pool } from "@/lib/db";
import type { Answers, Scores } from "@/lib/reboot-diagnostic";

/**
 * Accès en base au diagnostic Reboot 40.
 *
 * La création de table est rejouée ici plutôt que laissée à la seule migration
 * : le dépôt a des migrations mais aucun mécanisme qui les applique
 * automatiquement, et le reste de l'app procède déjà ainsi (voir les check-ins).
 * Le fichier db/migrations/003 reste la référence du schéma.
 */
async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reboot_diagnostics (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      answers               JSONB NOT NULL,
      score_global          INT NOT NULL,
      score_sommeil         INT NOT NULL,
      score_energie         INT NOT NULL,
      score_recuperation    INT NOT NULL,
      score_stress          INT NOT NULL,
      score_motivation      INT NOT NULL,
      score_confiance       INT NOT NULL,
      questionnaire_version INT NOT NULL DEFAULT 1,
      is_read               BOOLEAN NOT NULL DEFAULT false,
      submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id)
    )
  `);
}

/**
 * Le client doit-il remplir le diagnostic avant d'accéder à l'app ?
 *
 * Deux conditions : être un participant Reboot, et ne pas avoir déjà répondu.
 *
 * En cas d'erreur, renvoie false — c'est-à-dire laisse passer. Le choix est
 * délibéré : une base indisponible ne doit pas enfermer tous les participants
 * dehors, formulaire compris. Mieux vaut un diagnostic manqué qu'une app
 * inutilisable, et l'erreur est journalisée pour être vue.
 */
export async function needsRebootDiagnostic(clientId: string): Promise<boolean> {
  try {
    const { rows } = await pool.query<{ is_reboot_only: boolean }>(
      `SELECT is_reboot_only FROM clients WHERE id = $1`,
      [clientId]
    );
    if (!rows.length || !rows[0].is_reboot_only) return false;

    await ensureTable();

    const { rowCount } = await pool.query(
      `SELECT 1 FROM reboot_diagnostics WHERE client_id = $1`,
      [clientId]
    );
    return rowCount === 0;
  } catch (err) {
    console.error("[reboot-diagnostic] vérification impossible, accès laissé libre", err);
    return false;
  }
}

/** Enregistre le diagnostic. Idempotent : une seconde validation ne duplique rien. */
export async function saveRebootDiagnostic(
  clientId: string,
  answers: Answers,
  scores: Scores,
  version: number
): Promise<void> {
  await ensureTable();
  await pool.query(
    `INSERT INTO reboot_diagnostics (
       client_id, answers, questionnaire_version,
       score_global, score_sommeil, score_energie,
       score_recuperation, score_stress, score_motivation, score_confiance
     )
     VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (client_id) DO NOTHING`,
    [
      clientId,
      JSON.stringify(answers),
      version,
      scores.global,
      scores.sommeil,
      scores.energie,
      scores.recuperation,
      scores.stress,
      scores.motivation,
      scores.confiance,
    ]
  );
}

export type StoredDiagnostic = {
  answers: Answers;
  scores: Scores;
  submitted_at: Date;
};

/** Le diagnostic d'un client, pour le lui réafficher. */
export async function getRebootDiagnostic(clientId: string): Promise<StoredDiagnostic | null> {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT answers, submitted_at,
              score_global, score_sommeil, score_energie,
              score_recuperation, score_stress, score_motivation, score_confiance
       FROM reboot_diagnostics WHERE client_id = $1`,
      [clientId]
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      answers: row.answers as Answers,
      submitted_at: row.submitted_at as Date,
      scores: {
        global: row.score_global,
        sommeil: row.score_sommeil,
        energie: row.score_energie,
        recuperation: row.score_recuperation,
        stress: row.score_stress,
        motivation: row.score_motivation,
        confiance: row.score_confiance,
      },
    };
  } catch (err) {
    console.error("[reboot-diagnostic] lecture impossible", err);
    return null;
  }
}
