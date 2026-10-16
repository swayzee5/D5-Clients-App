"use server";

import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { historiqueCharges, derniereCharge } from "@/lib/queries/charges";

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

  // Reprendre une seance du jour restee en cours plutot que d'en creer une
  // nouvelle : sortir de l'ecran puis revenir ne doit ni repartir de zero ni
  // laisser des lignes 'in_progress' orphelines derriere soi.
  const existing = await pool
    .query(
      `SELECT id FROM workout_sessions
        WHERE client_id = $1 AND training_session_id = $2
          AND status = 'in_progress'
          AND started_at::date = NOW()::date
        ORDER BY started_at DESC
        LIMIT 1`,
      [clientId, sessionId]
    )
    .catch(() => ({ rows: [] as { id: string }[] }));

  if (existing.rows.length > 0) return existing.rows[0].id;

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

/**
 * L'historique des charges pour un exercice.
 *
 * L'identifiant du client vient de la session, jamais du composant : il
 * transitait par les propriétés du client, où n'importe qui pouvait le
 * remplacer par celui d'un autre et lire ses performances.
 *
 * La recherche remonte par le mouvement et non par la ligne de séance, pour
 * que refaire le programme n'efface pas l'historique — voir lib/queries/charges.
 */
export async function getExerciseHistory(
  exerciseId: string
): Promise<{ date: string; sets: { reps: number | null; weight: string | null }[] }[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const seances = await historiqueCharges(exerciseId, session.user.id);
  return seances.map((s) => ({
    date: s.date,
    sets: s.series.map((serie) => ({ reps: serie.reps, weight: serie.charge })),
  }));
}

/**
 * Ce qui a été fait la dernière fois, sur cette série précise.
 *
 * Affiché d'office pendant la série en cours : c'est la réponse à « je mets
 * du temps à trouver la bonne charge », et elle ne vaut que si elle est là
 * sans qu'on ait à la demander.
 */
export async function getDerniereCharge(
  exerciseId: string,
  setIndex: number
): Promise<{ date: string; reps: number | null; charge: string | null } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return derniereCharge(exerciseId, session.user.id, setIndex);
}
