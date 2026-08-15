"use server";

import { pool } from "@/lib/db";

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS manual_weight_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT NOT NULL,
      exercise_id UUID NOT NULL,
      set_index INT,
      weight_used VARCHAR(50),
      reps_done VARCHAR(20),
      logged_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
  // Les bases creees avant la saisie par serie n'ont pas la colonne.
  await pool
    .query(`ALTER TABLE manual_weight_logs ADD COLUMN IF NOT EXISTS set_index INT`)
    .catch(() => {});
  // Ensure auto-play tables exist so history query never fails
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL,
      training_session_id UUID NOT NULL,
      program_id UUID,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'in_progress',
      duration_seconds INT
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS set_performances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workout_session_id UUID NOT NULL,
      exercise_id UUID NOT NULL,
      set_index INT NOT NULL,
      reps_done INT,
      weight_used VARCHAR(50),
      rest_seconds_actual INT,
      tempo VARCHAR(20),
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
}

export type SetLog = { setIndex: number; weight: string; reps: string };

/**
 * Enregistre les charges d'un exercice, une ligne par serie.
 *
 * Les lignes du jour pour cet exercice sont d'abord supprimees : cocher,
 * decocher, corriger une valeur puis recocher ne doit pas empiler les doublons.
 */
export async function saveManualWeightLogs(
  clientId: string,
  exerciseId: string,
  sets: SetLog[]
): Promise<void> {
  const filled = sets.filter((s) => s.weight.trim() || s.reps.trim());
  await ensureTables();

  await pool
    .query(
      `DELETE FROM manual_weight_logs
       WHERE client_id = $1 AND exercise_id = $2::uuid AND logged_at::date = NOW()::date`,
      [clientId, exerciseId]
    )
    .catch(() => {});

  if (filled.length === 0) return;

  const values: string[] = [];
  const params: (string | number | null)[] = [clientId, exerciseId];
  filled.forEach((s, i) => {
    const base = i * 3 + 3;
    values.push(`($1, $2::uuid, $${base}, $${base + 1}, $${base + 2})`);
    params.push(s.setIndex, s.weight.trim() || null, s.reps.trim() || null);
  });

  await pool
    .query(
      `INSERT INTO manual_weight_logs (client_id, exercise_id, set_index, weight_used, reps_done)
       VALUES ${values.join(", ")}`,
      params
    )
    .catch(() => {});
}

export async function getExerciseWeightHistory(
  exerciseId: string,
  clientId: string
): Promise<{ date: string; entries: { reps: string | null; weight: string | null }[] }[]> {
  await ensureTables();
  const { rows } = await pool
    .query(
      `SELECT date, reps_done, weight_used FROM (
        SELECT
          ws.started_at::date AS date,
          sp.reps_done::text AS reps_done,
          sp.weight_used,
          sp.set_index AS ord
        FROM set_performances sp
        JOIN workout_sessions ws ON ws.id = sp.workout_session_id
        WHERE sp.exercise_id = $1::uuid
          AND ws.client_id = $2
          AND ws.status = 'completed'
        UNION ALL
        SELECT
          logged_at::date AS date,
          reps_done,
          weight_used,
          COALESCE(set_index, 0) AS ord
        FROM manual_weight_logs
        WHERE exercise_id = $1::uuid AND client_id = $2
      ) combined
      ORDER BY date DESC, ord ASC
      LIMIT 50`,
      [exerciseId, clientId]
    )
    .catch(() => ({ rows: [] as { date: string; reps_done: string | null; weight_used: string | null }[] }));

  const grouped: Record<string, { reps: string | null; weight: string | null }[]> = {};
  for (const row of rows as { date: string; reps_done: string | null; weight_used: string | null }[]) {
    const d = String(row.date);
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push({ reps: row.reps_done, weight: row.weight_used });
  }
  return Object.entries(grouped)
    .slice(0, 5)
    .map(([date, entries]) => ({ date, entries }));
}
