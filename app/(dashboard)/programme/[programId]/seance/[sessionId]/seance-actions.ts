"use server";

import { pool } from "@/lib/db";

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS manual_weight_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT NOT NULL,
      exercise_id UUID NOT NULL,
      weight_used VARCHAR(50),
      reps_done VARCHAR(20),
      logged_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
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

export async function saveManualWeightLog(
  clientId: string,
  exerciseId: string,
  weight: string,
  reps: string
): Promise<void> {
  if (!weight.trim() && !reps.trim()) return;
  await ensureTables();
  await pool
    .query(
      `INSERT INTO manual_weight_logs (client_id, exercise_id, weight_used, reps_done)
       VALUES ($1, $2, $3, $4)`,
      [clientId, exerciseId, weight.trim() || null, reps.trim() || null]
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
          0 AS ord
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
