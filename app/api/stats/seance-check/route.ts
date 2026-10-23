import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * Pourquoi tel exercice d'une séance s'affiche sans vidéo ni vignette.
 *
 * La question revient à chaque fois, et personne ne peut y répondre depuis
 * l'écran : la séance ne porte qu'un nom, la vidéo vient de la bibliothèque,
 * et le rattachement se fait au moment de l'affichage. Quand il échoue, le
 * client voit une tuile grise et rien n'en dit la cause.
 *
 * Trois causes possibles, et elles appellent trois gestes différents :
 *
 *   1. l'exercice n'est rattaché à rien — le nom ne correspond à aucune entrée
 *      active. C'est un accent décomposé, une apostrophe typographique ou une
 *      coquille, et il faut corriger le nom ;
 *   2. il est rattaché, mais l'entrée n'a pas de vidéo — souvent parce qu'un
 *      homonyme sans vidéo a été retenu ;
 *   3. il a bien sa vidéo, mais pas de vignette — et là il n'y a qu'à lancer
 *      /api/stats/no-thumb?fix=1.
 *
 * La route reproduit exactement la résolution de l'affichage, puis ajoute ce
 * que l'affichage ne peut pas dire : les entrées qui auraient dû
 * correspondre, et pourquoi elles ne correspondent pas.
 */

export const maxDuration = 30;

type LigneExercice = {
  id: string;
  name: string;
  library_exercise_id: string | null;
  vimeo_propre: string | null;
  vimeo_resolu: string | null;
  thumbnail_url: string | null;
  order_index: number;
};

type LigneBiblio = {
  id: string;
  name: string;
  vimeo_video_id: string | null;
  thumbnail_url: string | null;
  thumbnail_video_id: string | null;
  is_active: boolean;
};

/**
 * La clé de comparaison tolérante.
 *
 * L'affichage, lui, compare en LOWER(TRIM(...)) — donc un accent écrit en
 * deux caractères ou une apostrophe typographique le font échouer. En
 * comparant ici sans ces différences, on retrouve l'entrée que le coach
 * croyait avoir désignée, et on peut nommer l'écart exact.
 */
function cle(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** La comparaison que fait réellement l'affichage. */
function cleStricte(nom: string): string {
  return nom.trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Par défaut, les séances dont le nom contient ce qu'on cherche. Sans
  // paramètre, toutes les séances actives : la question se pose rarement sur
  // une seule.
  const nom = req.nextUrl.searchParams.get("nom") ?? "";

  try {
    const { rows: seances } = await pool.query<{
      id: string;
      name: string;
      programme: string;
      client: string | null;
    }>(
      `SELECT ts.id::text, ts.name, tp.name AS programme,
              COALESCE(c.first_name || ' ' || c.last_name, '—') AS client
         FROM training_sessions ts
         JOIN training_programs tp ON tp.id = ts.program_id
         LEFT JOIN clients c ON c.id = tp.client_id
        WHERE ($1 = '' OR ts.name ILIKE '%' || $1 || '%')
        ORDER BY ts.name
        LIMIT 20`,
      [nom]
    );

    if (seances.length === 0) {
      return NextResponse.json({
        cherché: nom || "(toutes)",
        séances: 0,
        remarque: "Aucune séance ne porte ce nom.",
      });
    }

    const { rows: biblio } = await pool.query<LigneBiblio>(
      `SELECT id::text, name, vimeo_video_id, thumbnail_url, thumbnail_video_id, is_active
         FROM exercise_library`
    );

    const parCleStricte = new Map<string, LigneBiblio[]>();
    const parCleTolerante = new Map<string, LigneBiblio[]>();
    for (const b of biblio) {
      if (!b.is_active) continue;
      for (const [index, k] of [
        [parCleStricte, cleStricte(b.name)],
        [parCleTolerante, cle(b.name)],
      ] as [Map<string, LigneBiblio[]>, string][]) {
        const liste = index.get(k) ?? [];
        liste.push(b);
        index.set(k, liste);
      }
    }

    const rapport = [];

    for (const s of seances) {
      const { rows: exercices } = await pool.query<LigneExercice>(
        `SELECT e.id::text, e.name, e.library_exercise_id::text,
                e.vimeo_video_id AS vimeo_propre,
                COALESCE(e.vimeo_video_id, el.vimeo_video_id) AS vimeo_resolu,
                CASE WHEN el.thumbnail_video_id IS NOT NULL
                      AND el.thumbnail_video_id IS DISTINCT FROM el.vimeo_video_id
                     THEN NULL ELSE el.thumbnail_url END AS thumbnail_url,
                e.order_index
           FROM exercises e
           LEFT JOIN LATERAL (
             SELECT el.vimeo_video_id, el.thumbnail_url, el.thumbnail_video_id
               FROM exercise_library el
              WHERE el.is_active = true
                AND ((e.library_exercise_id IS NOT NULL AND el.id = e.library_exercise_id)
                  OR (e.library_exercise_id IS NULL
                      AND LOWER(TRIM(el.name)) = LOWER(TRIM(e.name))))
              ORDER BY (el.thumbnail_url IS NOT NULL AND el.thumbnail_url <> '') DESC,
                       (el.vimeo_video_id IS NOT NULL) DESC,
                       el.created_at ASC
              LIMIT 1
           ) el ON TRUE
          WHERE e.session_id = $1::uuid
          ORDER BY e.order_index`,
        [s.id]
      );

      rapport.push({
        séance: s.name,
        client: s.client,
        programme: s.programme,
        exercices: exercices.map((e) => {
          const strict = parCleStricte.get(cleStricte(e.name)) ?? [];
          const tolerant = parCleTolerante.get(cle(e.name)) ?? [];

          let cause: string;
          if (e.vimeo_resolu && e.thumbnail_url) {
            cause = "OK — vidéo et vignette";
          } else if (e.vimeo_resolu) {
            cause =
              "Vignette manquante — lancer /api/stats/no-thumb?fix=1&tout=1 (la vidéo, elle, est là)";
          } else if (strict.length === 0 && tolerant.length > 0) {
            cause = `Nom non rattaché — la bibliothèque contient « ${tolerant[0].name} », qui ne se compare pas à l'identique (accent, apostrophe ou espace)`;
          } else if (strict.length === 0) {
            cause = "Aucune entrée de bibliothèque ne porte ce nom";
          } else if (!strict.some((b) => b.vimeo_video_id)) {
            cause = "Rattaché, mais aucune entrée de ce nom n'a de vidéo";
          } else {
            cause = `Rattaché à une entrée sans vidéo alors qu'un homonyme en a une (${strict.length} entrées de ce nom)`;
          }

          return {
            n: e.order_index + 1,
            nom: e.name,
            cause,
            vidéo: e.vimeo_resolu,
            vignette: e.thumbnail_url ? "oui" : "non",
            rattachéParId: !!e.library_exercise_id,
            entréesDeCeNom: strict.map((b) => ({
              nom: b.name,
              vidéo: b.vimeo_video_id,
              vignette: b.thumbnail_url ? "oui" : "non",
              vignetteDe: b.thumbnail_video_id,
            })),
            entréesProches:
              strict.length === 0
                ? tolerant.map((b) => ({ nom: b.name, vidéo: b.vimeo_video_id }))
                : undefined,
          };
        }),
      });
    }

    return NextResponse.json({ cherché: nom || "(toutes)", rapport });
  } catch (err) {
    console.error("[stats/seance-check]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
