import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [total, withVideo, noVideo, withThumb] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM exercise_library WHERE is_active = true`),
    pool.query(`SELECT COUNT(*) FROM exercise_library WHERE is_active = true AND vimeo_video_id IS NOT NULL`),
    pool.query(`SELECT COUNT(*) FROM exercise_library WHERE is_active = true AND vimeo_video_id IS NULL`),
    pool.query(`SELECT COUNT(*) FROM exercise_library WHERE is_active = true AND thumbnail_url IS NOT NULL AND thumbnail_url != ''`),
  ]);

  const noVideoList = await pool.query<{ name: string }>(
    `SELECT name FROM exercise_library WHERE is_active = true AND vimeo_video_id IS NULL ORDER BY name`
  );

  return NextResponse.json({
    total: parseInt(total.rows[0].count),
    avec_video: parseInt(withVideo.rows[0].count),
    sans_video: parseInt(noVideo.rows[0].count),
    avec_thumbnail: parseInt(withThumb.rows[0].count),
    liste_sans_video: noVideoList.rows.map(r => r.name),
  });
}
