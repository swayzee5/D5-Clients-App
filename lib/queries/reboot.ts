import { pool } from "@/lib/db";

export type RebootSession = {
  id: string;
  name: string;
  muscle_group: string;
  location: string;
  description: string | null;
  duration_minutes: number | null;
  order_index: number;
  exercise_count: number;
  completed: boolean;
};

export type RebootExercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  vimeo_video_id: string | null;
  order_index: number;
  notes: string | null;
};

export async function getRebootSessions(clientId: string): Promise<RebootSession[]> {
  const { rows } = await pool.query<RebootSession>(
    `SELECT
       rs.id,
       rs.name,
       rs.muscle_group,
       rs.location,
       rs.description,
       rs.duration_minutes,
       rs.order_index,
       (SELECT COUNT(*)::int FROM reboot_exercises WHERE session_id = rs.id) AS exercise_count,
       EXISTS(
         SELECT 1 FROM reboot_completions
         WHERE session_id = rs.id AND client_id = $1
       ) AS completed
     FROM reboot_sessions rs
     ORDER BY rs.order_index ASC`,
    [clientId]
  );
  return rows;
}

export async function getRebootSessionWithExercises(sessionId: string): Promise<{
  session: Omit<RebootSession, "exercise_count" | "completed">;
  exercises: RebootExercise[];
} | null> {
  const { rows: sessions } = await pool.query<Omit<RebootSession, "exercise_count" | "completed">>(
    `SELECT id, name, muscle_group, location, description, duration_minutes, order_index
     FROM reboot_sessions WHERE id = $1`,
    [sessionId]
  );
  if (!sessions.length) return null;

  const { rows: exercises } = await pool.query<RebootExercise>(
    `SELECT id, name, sets, reps, rest_seconds, vimeo_video_id, order_index, notes
     FROM reboot_exercises WHERE session_id = $1 ORDER BY order_index ASC`,
    [sessionId]
  );

  return { session: sessions[0], exercises };
}

export async function isSessionCompleted(clientId: string, sessionId: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM reboot_completions WHERE client_id = $1 AND session_id = $2
     ) AS exists`,
    [clientId, sessionId]
  );
  return rows[0]?.exists ?? false;
}
