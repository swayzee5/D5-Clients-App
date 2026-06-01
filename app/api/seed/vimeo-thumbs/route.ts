import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

type LibEx = { id: string; vimeo_video_id: string };

async function fetchVimeoThumb(videoId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const sizes: { width: number; link: string }[] = data.pictures?.sizes ?? [];
    const thumb = sizes.find((s) => s.width >= 640) ?? sizes[sizes.length - 1] ?? null;
    return thumb?.link ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "VIMEO_ACCESS_TOKEN manquant" }, { status: 500 });
  }

  await pool.query(
    `ALTER TABLE exercise_library ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`
  ).catch(() => null);

  const forceAll = req.nextUrl.searchParams.get("force") === "1";
  const { rows: exercises } = await pool.query<LibEx>(
    forceAll
      ? `SELECT id::text, vimeo_video_id FROM exercise_library WHERE vimeo_video_id IS NOT NULL AND is_active = true`
      : `SELECT id::text, vimeo_video_id FROM exercise_library WHERE vimeo_video_id IS NOT NULL AND is_active = true AND (thumbnail_url IS NULL OR thumbnail_url = '')`
  );

  if (!exercises.length) {
    return NextResponse.json({ message: "Tous les thumbnails sont déjà remplis", updated: 0 });
  }

  let updated = 0;
  let failed = 0;
  const BATCH = 10;

  for (let i = 0; i < exercises.length; i += BATCH) {
    const batch = exercises.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (ex) => {
        const url = await fetchVimeoThumb(ex.vimeo_video_id, token);
        if (url) {
          await pool.query(
            `UPDATE exercise_library SET thumbnail_url = $1 WHERE id = $2::uuid`,
            [url, ex.id]
          );
          updated++;
        } else {
          failed++;
        }
      })
    );
    if (i + BATCH < exercises.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return NextResponse.json({
    message: "Thumbnails mis à jour",
    total: exercises.length,
    updated,
    failed,
  });
}
