import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Diagnostic : entrees de exercise_library partageant le meme nom.
// Ce sont elles qui faisaient apparaitre un exercice plusieurs fois dans une
// seance (fan-out de jointure). Les requetes sont desormais bornees a une seule
// ligne, mais les doublons restent a nettoyer dans le CRM : a nom egal, une
// seule des videos est retenue, et le choix n'a pas de raison d'etre le bon.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { rows: duplicates } = await pool.query(
    `SELECT LOWER(TRIM(name)) AS normalized_name,
            COUNT(*)::int      AS entries,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id',            id,
                'name',          name,
                'vimeo_video_id', vimeo_video_id,
                'has_thumbnail', (thumbnail_url IS NOT NULL AND thumbnail_url <> ''),
                'created_at',    created_at
              ) ORDER BY created_at
            ) AS rows
     FROM exercise_library
     WHERE is_active = true
     GROUP BY LOWER(TRIM(name))
     HAVING COUNT(*) > 1
     ORDER BY COUNT(*) DESC, LOWER(TRIM(name))`
  );

  // Exercices de seance reellement impactes (ceux dont le nom pointe vers
  // plusieurs entrees de la bibliothegue et sans FK pour trancher).
  const { rows: affected } = await pool.query(
    `SELECT e.name,
            COUNT(DISTINCT el.id)::int AS library_matches,
            COUNT(DISTINCT e.id)::int  AS session_exercises
     FROM exercises e
     JOIN exercise_library el
       ON LOWER(TRIM(el.name)) = LOWER(TRIM(e.name))
       AND el.is_active = true
     WHERE e.library_exercise_id IS NULL
     GROUP BY e.name
     HAVING COUNT(DISTINCT el.id) > 1
     ORDER BY COUNT(DISTINCT el.id) DESC, e.name`
  );

  return NextResponse.json({
    duplicate_names: duplicates.length,
    affected_exercise_names: affected.length,
    duplicates,
    affected,
  });
}
