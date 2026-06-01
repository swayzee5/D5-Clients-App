import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Find exercises in sessions that don't match any exercise_library entry
  const { rows: unmatched } = await pool.query(
    `SELECT DISTINCT e.name AS exercise_name,
            el.name AS library_name,
            el.vimeo_video_id,
            el.thumbnail_url
     FROM exercises e
     LEFT JOIN exercise_library el
       ON LOWER(TRIM(el.name)) = LOWER(TRIM(e.name))
       AND el.is_active = true
     WHERE el.id IS NULL
     ORDER BY e.name`
  );

  // Also check exercises that matched but got no thumbnail
  const { rows: noThumbMatched } = await pool.query(
    `SELECT DISTINCT e.name AS exercise_name,
            el.name AS library_name,
            el.vimeo_video_id,
            el.thumbnail_url
     FROM exercises e
     INNER JOIN exercise_library el
       ON LOWER(TRIM(el.name)) = LOWER(TRIM(e.name))
       AND el.is_active = true
     WHERE el.vimeo_video_id IS NOT NULL
       AND (el.thumbnail_url IS NULL OR el.thumbnail_url = '')
     ORDER BY e.name`
  );

  return NextResponse.json({
    unmatched_count: unmatched.length,
    no_thumb_matched_count: noThumbMatched.length,
    unmatched: unmatched.map((r) => r.exercise_name),
    no_thumb_but_has_video: noThumbMatched.map((r) => ({
      exercise_name: r.exercise_name,
      library_name: r.library_name,
      vimeo_video_id: r.vimeo_video_id,
    })),
  });
}
