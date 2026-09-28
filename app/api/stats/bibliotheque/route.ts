import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * Chercher un exercice dans la bibliothèque.
 *
 * « Est-ce qu'il y a une vidéo pour le curl marteau ? » n'avait aucune réponse
 * rapide : la seule route existante liste les exercices sans vidéo, et le CRM
 * demande d'ouvrir la page et de faire défiler. La question revient à chaque
 * séance qu'on prépare.
 *
 * `?q=marteau` cherche dans le nom, sans distinction de casse, chaque mot
 * devant être présent — « curl marteau » trouve aussi « Curl marteau
 * haltères ». Sans `q`, la route rend les exercices les plus récents.
 *
 * Renvoie ce qu'il faut pour décider : l'identifiant Vimeo, la présence d'une
 * vignette, et surtout les homonymes et les vidéos partagées avec un autre
 * exercice — les deux défauts qui ont fait afficher trois fois la même
 * démonstration dans une séance.
 */

type Row = {
  name: string;
  vimeo_video_id: string | null;
  a_vignette: boolean;
  muscles: string[] | null;
  partage_sa_video_avec: string[] | null;
  entrees_du_meme_nom: number;
};

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  // Chaque mot doit être présent, dans n'importe quel ordre : on tape rarement
  // le nom exact, et « marteau curl » doit trouver autant que « curl marteau ».
  const motifs = q ? q.split(/\s+/).map((mot) => `%${mot.toLowerCase()}%`) : [];

  try {
    const { rows } = await pool.query<Row>(
      `SELECT el.name,
              el.vimeo_video_id,
              (el.thumbnail_url IS NOT NULL AND el.thumbnail_url <> '') AS a_vignette,
              el.muscles,
              (
                SELECT ARRAY_AGG(DISTINCT autre.name ORDER BY autre.name)
                FROM exercise_library autre
                WHERE autre.is_active = true
                  AND autre.id <> el.id
                  AND autre.vimeo_video_id = el.vimeo_video_id
              ) AS partage_sa_video_avec,
              (
                SELECT COUNT(*)::int FROM exercise_library homonyme
                WHERE homonyme.is_active = true
                  AND LOWER(TRIM(homonyme.name)) = LOWER(TRIM(el.name))
              ) AS entrees_du_meme_nom
       FROM exercise_library el
       WHERE el.is_active = true
         AND ($1::int = 0 OR LOWER(el.name) LIKE ALL($2::text[]))
       ORDER BY el.name
       LIMIT 50`,
      [motifs.length, motifs]
    );

    return NextResponse.json({
      recherche: q || "(tout)",
      trouvés: rows.length,
      exercices: rows.map((r) => ({
        nom: r.name,
        video: r.vimeo_video_id ?? "aucune",
        vignette: r.a_vignette,
        muscles: r.muscles ?? [],
        ...(r.partage_sa_video_avec?.length
          ? { videoPartagéeAvec: r.partage_sa_video_avec }
          : {}),
        ...(r.entrees_du_meme_nom > 1
          ? { doublonDeNom: `${r.entrees_du_meme_nom} entrées portent ce nom` }
          : {}),
      })),
    });
  } catch (err) {
    console.error("[stats/bibliotheque]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
