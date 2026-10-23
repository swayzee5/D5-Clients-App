import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * Rattacher à la bibliothèque les exercices que leur nom en sépare.
 *
 * Une séance ne porte qu'un nom ; la vidéo est retrouvée à l'affichage par
 * comparaison exacte avec la bibliothèque. Un singulier contre un pluriel
 * (« Pec fly inversé » contre « Pecs fly inversé »), un accent écrit en deux
 * caractères, une apostrophe typographique — et le client voit une tuile
 * grise. La vidéo existe, elle est juste inatteignable.
 *
 * Ces écarts ne se corrigent pas à la main : ils sont invisibles à l'œil,
 * c'est précisément ce qui les rend coûteux. La route les trouve en comparant
 * sans ce qui ne devrait pas compter, puis réécrit le nom de la séance avec
 * celui de la bibliothèque et pose le lien par identifiant — qui, lui, ne
 * dépend plus de l'orthographe.
 *
 * Deux garde-fous :
 *
 *   - rien n'est modifié sans `fix=1` ; l'essai montre chaque couple ;
 *   - un exercice n'est rattaché que si UNE seule entrée correspond. Deux
 *     candidates, c'est un choix de coach, pas une correction automatique.
 */

export const maxDuration = 60;

type ExerciceOrphelin = {
  id: string;
  name: string;
  seance: string;
  client: string | null;
};

type LigneBiblio = {
  id: string;
  name: string;
  vimeo_video_id: string | null;
};

/**
 * La clé de comparaison tolérante.
 *
 * Elle ignore ce qui ne change pas l'exercice : la casse, les accents écrits
 * en deux caractères, les apostrophes typographiques, les espaces en trop,
 * la ponctuation, et le pluriel. Le « s » final de chaque mot saute — c'est
 * grossier pour du français, mais sur des noms d'exercices ça ne confond que
 * des mots qui désignent déjà la même chose.
 */
function cle(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’ʼ`´]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((mot) => (mot.length > 3 ? mot.replace(/s$/, "") : mot))
    .join(" ");
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const fix = req.nextUrl.searchParams.get("fix") === "1";

  try {
    // Les exercices qu'aucune entrée active ne rejoint par comparaison
    // exacte — c'est-à-dire ceux que l'affichage laisse muets.
    const { rows: orphelins } = await pool.query<ExerciceOrphelin>(
      `SELECT e.id::text, e.name, ts.name AS seance,
              COALESCE(c.first_name || ' ' || c.last_name, '—') AS client
         FROM exercises e
         JOIN training_sessions ts ON ts.id = e.session_id
         JOIN training_programs tp ON tp.id = ts.program_id
         LEFT JOIN clients c ON c.id = tp.client_id
        WHERE NOT EXISTS (
                SELECT 1 FROM exercise_library el
                 WHERE el.is_active = true
                   AND ((e.library_exercise_id IS NOT NULL AND el.id = e.library_exercise_id)
                     OR (e.library_exercise_id IS NULL
                         AND LOWER(TRIM(el.name)) = LOWER(TRIM(e.name))))
              )
        ORDER BY ts.name, e.order_index`
    );

    const { rows: biblio } = await pool.query<LigneBiblio>(
      `SELECT id::text, name, vimeo_video_id
         FROM exercise_library WHERE is_active = true`
    );

    const index = new Map<string, LigneBiblio[]>();
    for (const b of biblio) {
      const k = cle(b.name);
      const liste = index.get(k) ?? [];
      liste.push(b);
      index.set(k, liste);
    }

    const rattachables: {
      exercice: string;
      versBibliotheque: string;
      seance: string;
      client: string | null;
      video: string | null;
      id: string;
      cibleId: string;
    }[] = [];
    const ambigus: { exercice: string; candidates: string[] }[] = [];
    const introuvables: { exercice: string; seance: string; client: string | null }[] = [];

    for (const o of orphelins) {
      const candidats = index.get(cle(o.name)) ?? [];
      if (candidats.length === 1) {
        rattachables.push({
          id: o.id,
          exercice: o.name,
          versBibliotheque: candidats[0].name,
          seance: o.seance,
          client: o.client,
          video: candidats[0].vimeo_video_id,
          cibleId: candidats[0].id,
        });
      } else if (candidats.length > 1) {
        // Deux entrées plausibles : c'est un choix de coach. En trancher
        // automatiquement, c'est risquer de montrer un autre mouvement.
        ambigus.push({ exercice: o.name, candidates: candidats.map((c) => c.name) });
      } else {
        introuvables.push({ exercice: o.name, seance: o.seance, client: o.client });
      }
    }

    if (!fix) {
      return NextResponse.json({
        essai: true,
        orphelins: orphelins.length,
        àRattacher: rattachables.length,
        rattachements: rattachables.map((r) => ({
          de: r.exercice,
          vers: r.versBibliotheque,
          séance: r.seance,
          client: r.client,
          vidéo: r.video ?? "aucune vidéo dans la bibliothèque non plus",
        })),
        ambigus,
        introuvables,
        pourAppliquer: "ajouter &fix=1 à cette adresse",
      });
    }

    let faits = 0;
    for (const r of rattachables) {
      // Le nom ET le lien par identifiant : le nom pour que le coach relise
      // la même chose des deux côtés, l'identifiant pour que le rattachement
      // survive à la prochaine correction d'orthographe.
      await pool.query(
        `UPDATE exercises
            SET name = $1, library_exercise_id = $2::uuid
          WHERE id = $3::uuid`,
        [r.versBibliotheque, r.cibleId, r.id]
      );
      faits++;
    }

    return NextResponse.json({
      rattachés: faits,
      détail: rattachables.map((r) => `« ${r.exercice} » → « ${r.versBibliotheque} » (${r.client})`),
      ambigus,
      introuvables,
      suite:
        introuvables.length > 0
          ? "Les introuvables n'existent pas dans la bibliothèque : il faut les y créer, ou les remplacer dans la séance."
          : "Rien ne reste à rattacher.",
    });
  } catch (err) {
    console.error("[stats/rattacher]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
