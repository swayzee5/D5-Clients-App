import { pool } from "@/lib/db";
import type { ReponsesNutrition } from "@/lib/nutrition-suivi";

/**
 * Le suivi nutritionnel en base.
 *
 * Une seule table, et chaque envoi y ajoute une ligne : le premier est le
 * questionnaire de départ, les suivants sont les points de six semaines.
 * Écraser une ligne unique aurait fait disparaître l'historique, qui est
 * précisément ce que le coach regarde — « il disait tenir à son verre du
 * week-end, et six semaines plus tard c'est le déjeuner du midi qui coince ».
 *
 * Le profil courant n'est donc pas une ligne à part : c'est la dernière.
 */

export type TypeEnvoi = "depart" | "point";

export type EnvoiNutrition = {
  id: string;
  type: TypeEnvoi;
  reponses: ReponsesNutrition;
  envoyeLe: Date;
};

let pret = false;

async function ensureSchema(): Promise<void> {
  if (pret) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nutrition_checkins (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id  UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      /** « depart » pour le questionnaire initial, « point » ensuite. */
      type       TEXT        NOT NULL DEFAULT 'point',
      reponses   JSONB       NOT NULL,
      version    INT         NOT NULL DEFAULT 1,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS nutrition_checkins_client_idx
       ON nutrition_checkins (client_id, submitted_at DESC)`
  );
  pret = true;
}

type Ligne = {
  id: string;
  type: TypeEnvoi;
  reponses: ReponsesNutrition;
  submitted_at: Date;
};

const versEnvoi = (l: Ligne): EnvoiNutrition => ({
  id: l.id,
  type: l.type,
  reponses: l.reponses,
  envoyeLe: l.submitted_at,
});

/** Tous les envois d'un client, du plus récent au plus ancien. */
export async function listerEnvois(clientId: string): Promise<EnvoiNutrition[]> {
  await ensureSchema();
  const { rows } = await pool.query<Ligne>(
    `SELECT id::text AS id, type, reponses, submitted_at
       FROM nutrition_checkins
      WHERE client_id = $1::uuid
      ORDER BY submitted_at DESC`,
    [clientId]
  );
  return rows.map(versEnvoi);
}

/** Le dernier envoi, quel qu'en soit le type. */
export async function dernierEnvoi(clientId: string): Promise<EnvoiNutrition | null> {
  await ensureSchema();
  const { rows } = await pool.query<Ligne>(
    `SELECT id::text AS id, type, reponses, submitted_at
       FROM nutrition_checkins
      WHERE client_id = $1::uuid
      ORDER BY submitted_at DESC
      LIMIT 1`,
    [clientId]
  );
  return rows[0] ? versEnvoi(rows[0]) : null;
}

/**
 * Enregistre un envoi.
 *
 * Deux envois du même type le même jour sont refusés : revenir sur l'écran
 * après avoir répondu ne doit pas créer un doublon qui fausserait la lecture
 * du coach, ni réarmer le compteur des six semaines.
 */
export async function enregistrerEnvoi(valeurs: {
  clientId: string;
  type: TypeEnvoi;
  reponses: ReponsesNutrition;
  version: number;
}): Promise<{ ok: boolean; doublon?: boolean }> {
  await ensureSchema();
  const { rows } = await pool.query<{ existe: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM nutrition_checkins
        WHERE client_id = $1::uuid AND type = $2
          AND submitted_at::date = NOW()::date
     ) AS existe`,
    [valeurs.clientId, valeurs.type]
  );
  if (rows[0]?.existe) return { ok: true, doublon: true };

  await pool.query(
    `INSERT INTO nutrition_checkins (client_id, type, reponses, version)
     VALUES ($1::uuid, $2, $3, $4)`,
    [valeurs.clientId, valeurs.type, JSON.stringify(valeurs.reponses), valeurs.version]
  );
  return { ok: true };
}

/**
 * Les clients dont le point est dû, pour la relance quotidienne.
 *
 * Seuls les clients actifs et non participants Reboot : le suivi
 * nutritionnel appartient à l'accompagnement, pas au challenge de sept jours.
 */
export async function clientsAvecPointDu(
  joursEntrePoints: number
): Promise<{ id: string; prenom: string; jours: number }[]> {
  await ensureSchema();
  const { rows } = await pool.query<{ id: string; first_name: string; jours: number }>(
    `SELECT c.id::text AS id, c.first_name,
            (NOW()::date - MAX(n.submitted_at)::date) AS jours
       FROM clients c
       JOIN nutrition_checkins n ON n.client_id = c.id
      WHERE c.is_active = true
        AND c.is_blocked = false
        AND c.is_reboot_only = false
      GROUP BY c.id, c.first_name
     HAVING (NOW()::date - MAX(n.submitted_at)::date) >= $1`,
    [joursEntrePoints]
  );
  return rows.map((r) => ({ id: r.id, prenom: r.first_name, jours: Number(r.jours) }));
}
