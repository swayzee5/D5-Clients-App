import { pool } from "@/lib/db";

export type SessionExercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  order_index: number;
};

export type ProgramSession = {
  id: string;
  name: string;
  day_of_week: number | null;
  order_index: number;
  exercises: SessionExercise[];
};

export type ActiveProgram = {
  id: string;
  name: string;
  description: string | null;
  weeks_duration: number | null;
  start_date: string | null;
  is_active: boolean;
  sessions: ProgramSession[];
};

export async function getActiveProgram(
  clientId: string
): Promise<ActiveProgram | null> {
  const { rows: programs } = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    weeks_duration: number | null;
    start_date: string | null;
    is_active: boolean;
  }>(
    `SELECT id, name, description, weeks_duration, start_date, is_active
     FROM training_programs
     WHERE client_id = $1 AND is_active = true
     ORDER BY created_at DESC
     LIMIT 1`,
    [clientId]
  );

  if (!programs.length) return null;
  const program = programs[0];

  const { rows: sessions } = await pool.query<{
    id: string;
    name: string;
    day_of_week: number | null;
    order_index: number;
  }>(
    `SELECT id, name, day_of_week, order_index
     FROM training_sessions
     WHERE program_id = $1
     ORDER BY order_index ASC`,
    [program.id]
  );

  if (!sessions.length) {
    return { ...program, sessions: [] };
  }

  const sessionIds = sessions.map((s) => s.id);

  const { rows: exercises } = await pool.query<
    SessionExercise & { session_id: string }
  >(
    `SELECT id, session_id, name, sets, reps, rest_seconds, order_index
     FROM exercises
     WHERE session_id = ANY($1::uuid[])
     ORDER BY session_id, order_index ASC`,
    [sessionIds]
  );

  const sessionsWithExercises: ProgramSession[] = sessions.map((s) => ({
    ...s,
    exercises: exercises.filter((e) => e.session_id === s.id),
  }));

  return { ...program, sessions: sessionsWithExercises };
}
