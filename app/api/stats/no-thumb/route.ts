import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

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
  const token = process.env.VIMEO_ACCESS_TOKEN;

  const { rows: exercises } = await pool.query<ExNoThumb>(
    `SELECT id::text, name, vimeo_video_id
     FROM exercise_library
     WHERE vimeo_video_id IS NOT NULL
       AND (thumbnail_url IS NULL OR thumbnail_url = '')
       AND is_active = true
     ORDER BY name`
  );

  if (!fix) {
    return NextResponse.json({
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

  for (const ex of exercises) {
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

  const nullified = results.filter((r) => r.action.startsWith("vimeo_video_id set NULL")).length;
  const updated = results.filter((r) => r.action === "thumbnail updated").length;

  return NextResponse.json({
    total: exercises.length,
    nullified,
    updated,
    results,
  });
}
