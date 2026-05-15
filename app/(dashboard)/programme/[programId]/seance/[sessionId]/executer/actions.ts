"use server";

import { pool } from "@/lib/db";

async function ensureTables() {
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
  `);
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
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workout_session_id UUID NOT NULL,
      client_id UUID NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function startWorkoutSession(
  sessionId: string,
  clientId: string,
  programId: string
): Promise<string> {
  await ensureTables();
  const { rows } = await pool.query(
    `INSERT INTO workout_sessions (client_id, training_session_id, program_id)
     VALUES ($1, $2, $3) RETURNING id`,
    [clientId, sessionId, programId]
  );
  return rows[0].id;
}

export async function saveSetPerformance(
  workoutSessionId: string,
  exerciseId: string,
  setIndex: number,
  repsDone: number | null,
  weightUsed: string,
  restSecondsActual: number | null,
  tempo: string
): Promise<void> {
  await pool.query(
    `INSERT INTO set_performances
       (workout_session_id, exercise_id, set_index, reps_done, weight_used, rest_seconds_actual, tempo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      workoutSessionId,
      exerciseId,
      setIndex,
      repsDone || null,
      weightUsed || null,
      restSecondsActual || null,
      tempo || null,
    ]
  );
}

export async function completeWorkoutSession(
  workoutSessionId: string,
  durationSeconds: number
): Promise<void> {
  await pool.query(
    `UPDATE workout_sessions
     SET status = 'completed', completed_at = NOW(), duration_seconds = $2
     WHERE id = $1`,
    [workoutSessionId, durationSeconds]
  );
}

export async function saveSessionNote(
  workoutSessionId: string,
  clientId: string,
  content: string
): Promise<void> {
  if (!content.trim()) return;
  await pool.query(
    `INSERT INTO session_notes (workout_session_id, client_id, content)
     VALUES ($1, $2, $3)`,
    [workoutSessionId, clientId, content.trim()]
  );
}

export async function getExerciseHistory(
  exerciseId: string,
  clientId: string
): Promise<{ date: string; sets: { reps: number | null; weight: string | null }[] }[]> {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT ws.started_at::date as date, sp.reps_done, sp.weight_used, sp.set_index
     FROM set_performances sp
     JOIN workout_sessions ws ON ws.id = sp.workout_session_id
     WHERE sp.exercise_id = $1 AND ws.client_id = $2 AND ws.status = 'completed'
     ORDER BY ws.started_at DESC, sp.set_index ASC
     LIMIT 40`,
    [exerciseId, clientId]
  );

  const grouped: Record<string, { reps: number | null; weight: string | null }[]> = {};
  for (const row of rows) {
    const d = row.date;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push({ reps: row.reps_done, weight: row.weight_used });
  }
  return Object.entries(grouped)
    .slice(0, 5)
    .map(([date, sets]) => ({ date, sets }));
}
