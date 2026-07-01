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
  await pool.query(`ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS rpe INT`);
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

export async function quickCompleteSession(
  sessionId: string,
  clientId: string,
  programId: string,
  rpe: number | null,
  note: string,
  durationSeconds: number | null,
  existingWorkoutSessionId?: string
): Promise<void> {
  await ensureTables();

  let sessionRowId: string;

  if (existingWorkoutSessionId) {
    // Auto-play mode: session already completed, just add RPE
    await pool.query(
      `UPDATE workout_sessions SET rpe = $1 WHERE id = $2 AND client_id = $3`,
      [rpe, existingWorkoutSessionId, clientId]
    );
    sessionRowId = existingWorkoutSessionId;
  } else {
    // Manual mode: insert a new completed session
    const { rows } = await pool.query(
      `INSERT INTO workout_sessions
         (client_id, training_session_id, program_id, status, completed_at, duration_seconds, rpe)
       VALUES ($1, $2, $3, 'completed', NOW(), $4, $5)
       RETURNING id`,
      [clientId, sessionId, programId, durationSeconds || null, rpe]
    );
    sessionRowId = rows[0].id;
  }

  if (note.trim()) {
    await pool.query(
      `INSERT INTO session_notes (workout_session_id, client_id, content)
       VALUES ($1, $2, $3)`,
      [sessionRowId, clientId, note.trim()]
    );
  }
}
