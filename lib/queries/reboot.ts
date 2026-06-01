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
  thumbnail_url: string | null;
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
    `SELECT
       re.id,
       re.name,
       re.sets,
       re.reps,
       re.rest_seconds,
       re.order_index,
       re.notes,
       COALESCE(re.vimeo_video_id, el.vimeo_video_id) AS vimeo_video_id,
       el.thumbnail_url
     FROM reboot_exercises re
     LEFT JOIN exercise_library el
       ON LOWER(TRIM(el.name)) = LOWER(TRIM(re.name))
       AND el.vimeo_video_id IS NOT NULL
     WHERE re.session_id = $1
     ORDER BY re.order_index ASC`,
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
