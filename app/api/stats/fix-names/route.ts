import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Find exercise_library entries similar to the unmatched names
// to determine correct mappings
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const terms = ["dips", "développé militaire", "militaire"];

  const results: Record<string, string[]> = {};
  for (const term of terms) {
    const { rows } = await pool.query(
      `SELECT name, vimeo_video_id, thumbnail_url
       FROM exercise_library
       WHERE LOWER(name) LIKE '%' || LOWER($1) || '%'
         AND is_active = true
       ORDER BY name`,
      [term]
    );
    results[term] = rows.map((r: { name: string; vimeo_video_id: string | null; thumbnail_url: string | null }) =>
      `${r.name} | video: ${r.vimeo_video_id ?? "none"} | thumb: ${r.thumbnail_url ? "yes" : "no"}`
    );
  }

  return NextResponse.json(results);
}
