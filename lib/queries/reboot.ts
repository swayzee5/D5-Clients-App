import { pool } from "@/lib/db";
import { exerciseLibraryLateral } from "./exercise-library";

export type RebootSession = {
  id: string;
  name: string;
  muscle_group: string;
  location: string;
  /** Onglet d'affichage : salle, maison, mobilite ou hiit. */
  tab: string;
  /** Vrai pour les échauffements et HIIT, qui ne comptent pas dans l'objectif. */
  is_bonus: boolean;
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

/**
 * Colonnes ajoutées par la migration 004 (onglets, slug, activation).
 *
 * Le dépôt n'applique pas ses migrations automatiquement : elles le sont par la
 * route de seed. Entre un déploiement et son premier appel de seed, ces
 * colonnes manqueraient et la requête ci-dessous échouerait — la section
 * séances disparaîtrait de l'app sans autre signe. Le rattrapage est fait une
 * seule fois par instance, d'où la promesse mémoïsée.
 */
let schemaReady: Promise<void> | null = null;

function ensureColumns(): Promise<void> {
  schemaReady ??= (async () => {
    await pool.query(`ALTER TABLE reboot_sessions  ADD COLUMN IF NOT EXISTS tab       TEXT NOT NULL DEFAULT 'salle'`);
    await pool.query(`ALTER TABLE reboot_sessions  ADD COLUMN IF NOT EXISTS is_bonus  BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE reboot_sessions  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
    await pool.query(`ALTER TABLE reboot_sessions  ADD COLUMN IF NOT EXISTS slug      TEXT`);
    await pool.query(`ALTER TABLE reboot_exercises ADD COLUMN IF NOT EXISTS library_exercise_id UUID`);
  })().catch((err) => {
    // Ne pas mémoïser un échec : la tentative suivante doit pouvoir réussir.
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}

/**
 * Les séances visibles par un participant.
 *
 * Deux filtres qui n'existaient pas : `is_active`, pour retirer les anciennes
 * séances genrées sans effacer les validations qui les référencent, et la
 * présence d'au moins un exercice. Une séance vide était listée, cliquable, et
 * s'ouvrait sur « les exercices arrivent bientôt » — le symptôme le plus
 * visible de l'ancien seed.
 */
export async function getRebootSessions(clientId: string): Promise<RebootSession[]> {
  await ensureColumns();
  const { rows } = await pool.query<RebootSession>(
    `SELECT
       rs.id,
       rs.name,
       rs.muscle_group,
       rs.location,
       rs.tab,
       rs.is_bonus,
       rs.description,
       rs.duration_minutes,
       rs.order_index,
       (SELECT COUNT(*)::int FROM reboot_exercises WHERE session_id = rs.id) AS exercise_count,
       EXISTS(
         SELECT 1 FROM reboot_completions
         WHERE session_id = rs.id AND client_id = $1
       ) AS completed
     FROM reboot_sessions rs
     WHERE rs.is_active
       AND EXISTS (SELECT 1 FROM reboot_exercises WHERE session_id = rs.id)
     ORDER BY rs.order_index ASC`,
    [clientId]
  );
  return rows;
}

export async function getRebootSessionWithExercises(sessionId: string): Promise<{
  session: Omit<RebootSession, "exercise_count" | "completed">;
  exercises: RebootExercise[];
} | null> {
  await ensureColumns();
  const { rows: sessions } = await pool.query<Omit<RebootSession, "exercise_count" | "completed">>(
    `SELECT id, name, muscle_group, location, tab, is_bonus, description, duration_minutes, order_index
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
     ${exerciseLibraryLateral("re", "library_exercise_id")}
     WHERE re.session_id = $1
     ORDER BY re.order_index ASC`,
    [sessionId]
  );

  return { session: sessions[0], exercises };
}

/**
 * Nombre de séances du challenge validées par un participant.
 *
 * Les échauffements, étirements et HIIT sont exclus : ce sont des vidéos
 * d'appoint, et les compter permettrait de terminer les trois séances du
 * challenge sans en faire une seule. Le décompte sert à la progression, au
 * palier de notification, au certificat et au verrouillage des messages
 * WhatsApp — d'où une fonction unique plutôt que la même jointure recopiée à
 * six endroits.
 *
 * Le repli sans jointure couvre l'instant qui suit un déploiement, avant que la
 * colonne is_bonus n'existe.
 */
export async function countSeanceCompletions(clientId: string): Promise<number> {
  try {
    const { rows } = await pool.query<{ cnt: string }>(
      `SELECT COUNT(DISTINCT rc.session_id) AS cnt
       FROM reboot_completions rc
       JOIN reboot_sessions rs ON rs.id = rc.session_id
       WHERE rc.client_id = $1::uuid AND NOT rs.is_bonus`,
      [clientId]
    );
    return Number(rows[0]?.cnt ?? 0);
  } catch {
    const { rows } = await pool.query<{ cnt: string }>(
      `SELECT COUNT(DISTINCT session_id) AS cnt FROM reboot_completions WHERE client_id = $1::uuid`,
      [clientId]
    );
    return Number(rows[0]?.cnt ?? 0);
  }
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
