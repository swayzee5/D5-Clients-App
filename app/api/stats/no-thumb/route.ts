import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

/**
 * Reprendre toutes les miniatures demande un appel à Vimeo par exercice. En
 * série, deux cents exercices dépassent largement le temps imparti à une
 * fonction serveur — la route était coupée en plein travail et laissait la
 * moitié des miniatures à jour, l'autre non, sans rien dire.
 */
export const maxDuration = 60;

/** Appels simultanés à Vimeo. Assez pour tenir dans le temps imparti, assez
 *  peu pour ne pas se faire limiter par leur API. */
const LOT = 8;

type ExNoThumb = {
  id: string;
  name: string;
  vimeo_video_id: string;
};

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const fix = req.nextUrl.searchParams.get("fix") === "1";
  // `tout=1` reprend aussi les miniatures déjà présentes.
  //
  // Une miniature illustre une vidéo précise : corriger l'identifiant Vimeo
  // d'un exercice sans la renouveler laisse l'aperçu de l'ancien mouvement
  // sur le nouveau. Ces cas-là ne sont pas des miniatures manquantes, ils
  // sont pires — une image fausse se lit comme une information, une image
  // absente se voit.
  //
  // Reste une option explicite : reprendre les deux cent et quelques
  // exercices fait autant d'appels à Vimeo, inutiles la plupart du temps.
  const tout = req.nextUrl.searchParams.get("tout") === "1";
  const token = process.env.VIMEO_ACCESS_TOKEN;

  const { rows: exercises } = await pool.query<ExNoThumb>(
    `SELECT id::text, name, vimeo_video_id
     FROM exercise_library
     WHERE vimeo_video_id IS NOT NULL
       AND ($1::boolean OR thumbnail_url IS NULL OR thumbnail_url = '')
       AND is_active = true
     ORDER BY name`,
    [tout]
  );

  if (!fix) {
    return NextResponse.json({
      périmètre: tout
        ? "tous les exercices ayant une vidéo"
        : "exercices ayant une vidéo mais aucune miniature",
      total: exercises.length,
      exercises: exercises.map((e) => ({ name: e.name, vimeo_video_id: e.vimeo_video_id })),
    });
  }

  if (!token) {
    return NextResponse.json({ error: "VIMEO_ACCESS_TOKEN manquant" }, { status: 500 });
  }

  const results: {
    name: string;
    vimeo_video_id: string;
    status: number | string;
    action: string;
  }[] = [];

  async function traiter(ex: ExNoThumb) {
    let httpStatus: number | string = "error";
    let action = "skipped";

    try {
      const res = await fetch(`https://api.vimeo.com/videos/${ex.vimeo_video_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      httpStatus = res.status;

      if (res.status === 404 || res.status === 403) {
        await pool.query(
          `UPDATE exercise_library SET vimeo_video_id = NULL WHERE id = $1::uuid`,
          [ex.id]
        );
        action = `vimeo_video_id set NULL (status ${res.status})`;
      } else if (res.ok) {
        const data = await res.json();
        const sizes: { width: number; link: string }[] = data.pictures?.sizes ?? [];
        const thumb = sizes.find((s) => s.width >= 640) ?? sizes[sizes.length - 1] ?? null;
        if (thumb?.link) {
          await pool.query(
            `UPDATE exercise_library SET thumbnail_url = $1 WHERE id = $2::uuid`,
            [thumb.link, ex.id]
          );
          action = "thumbnail updated";
        } else {
          action = "no thumbnail in Vimeo response";
        }
      } else {
        action = `unexpected status ${res.status}`;
      }
    } catch (e) {
      httpStatus = "fetch error";
      action = String(e);
    }

    results.push({
      name: ex.name,
      vimeo_video_id: ex.vimeo_video_id,
      status: httpStatus,
      action,
    });
  }

  for (let i = 0; i < exercises.length; i += LOT) {
    await Promise.all(exercises.slice(i, i + LOT).map(traiter));
  }

  const nullified = results.filter((r) => r.action.startsWith("vimeo_video_id set NULL")).length;
  const updated = results.filter((r) => r.action === "thumbnail updated").length;

  return NextResponse.json({
    périmètre: tout
      ? "tous les exercices ayant une vidéo"
      : "exercices ayant une vidéo mais aucune miniature",
    total: exercises.length,
    nullified,
    updated,
    results,
  });
}
