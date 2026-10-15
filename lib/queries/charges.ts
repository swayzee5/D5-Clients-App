import { pool } from "@/lib/db";

/**
 * L'historique des charges, exercice par exercice.
 *
 * Deux problèmes sont traités ici, et le second est le plus coûteux.
 *
 * 1. Retrouver sa charge prend du temps au milieu d'une séance. L'historique
 *    existait, mais derrière un bouton : il fallait y penser les mains sur la
 *    barre. Ce qu'il faut, c'est la dernière charge affichée d'office, en face
 *    de la série en cours — série 3 comparée à série 3, pas à une moyenne.
 *
 * 2. L'historique était cherché sur `exercise_id`, qui identifie la ligne d'un
 *    exercice DANS UNE séance précise — pas le mouvement. Le jour où le coach
 *    refait le programme, les lignes changent d'identifiant et tout
 *    l'historique disparaît, alors que le développé couché reste le développé
 *    couché. On remonte donc par l'exercice de la bibliothèque, et par le nom
 *    quand la ligne n'y est pas rattachée.
 */

export type SerieFaite = {
  setIndex: number;
  reps: number | null;
  charge: string | null;
};

export type SeanceFaite = {
  date: string;
  series: SerieFaite[];
};

type Ligne = {
  set_index: number;
  reps_done: number | null;
  weight_used: string | null;
  jour: string;
};

/**
 * Les séances passées où ce mouvement a été fait, de la plus récente à la plus
 * ancienne.
 *
 * `limite` est un nombre de séances, pas de lignes : une séance de 5 séries et
 * une de 3 doivent compter pareil.
 */
export async function historiqueCharges(
  exerciseId: string,
  clientId: string,
  limite = 6
): Promise<SeanceFaite[]> {
  let rows: Ligne[];
  try {
    const res = await pool.query<Ligne>(
      `WITH cible AS (
         SELECT library_exercise_id, lower(btrim(name)) AS nom
           FROM session_exercises WHERE id = $1::uuid
       ),
       memes_exercices AS (
         SELECT se.id
           FROM session_exercises se, cible c
          WHERE (c.library_exercise_id IS NOT NULL
                 AND se.library_exercise_id = c.library_exercise_id)
             OR (c.library_exercise_id IS NULL
                 AND lower(btrim(se.name)) = c.nom)
       )
       SELECT sp.set_index,
              sp.reps_done,
              sp.weight_used,
              to_char(ws.started_at, 'YYYY-MM-DD') AS jour
         FROM set_performances sp
         JOIN workout_sessions ws ON ws.id = sp.workout_session_id
        WHERE sp.exercise_id IN (SELECT id FROM memes_exercices)
          AND ws.client_id = $2::uuid
          AND ws.status = 'completed'
          AND (sp.reps_done IS NOT NULL OR sp.weight_used IS NOT NULL)
        ORDER BY ws.started_at DESC, sp.set_index ASC
        LIMIT 200`,
      [exerciseId, clientId]
    );
    rows = res.rows;
  } catch (err) {
    // Un historique indisponible ne doit jamais empêcher de s'entraîner :
    // l'écran d'exécution continue sans lui.
    console.error("[charges] historique indisponible", err);
    return [];
  }

  const parJour = new Map<string, SerieFaite[]>();
  for (const r of rows) {
    const series = parJour.get(r.jour) ?? [];
    series.push({ setIndex: r.set_index, reps: r.reps_done, charge: r.weight_used });
    parJour.set(r.jour, series);
  }

  const resultat: SeanceFaite[] = [];
  parJour.forEach((series, date) => resultat.push({ date, series }));
  return resultat.slice(0, limite);
}

/**
 * Ce qu'il faut afficher pendant la série en cours : ce qui a été fait la
 * dernière fois, sur cette série-là.
 *
 * Si la séance précédente comptait moins de séries, on retombe sur la
 * dernière connue plutôt que de n'afficher rien — quelqu'un qui passe de 3 à
 * 4 séries veut savoir avec quoi il a fini.
 */
export async function derniereCharge(
  exerciseId: string,
  clientId: string,
  setIndex: number
): Promise<{ date: string; reps: number | null; charge: string | null } | null> {
  const historique = await historiqueCharges(exerciseId, clientId, 1);
  const derniere = historique[0];
  if (!derniere || derniere.series.length === 0) return null;

  const exacte = derniere.series.find((s) => s.setIndex === setIndex);
  const serie = exacte ?? derniere.series[derniere.series.length - 1];
  if (serie.reps === null && serie.charge === null) return null;

  return { date: derniere.date, reps: serie.reps, charge: serie.charge };
}
