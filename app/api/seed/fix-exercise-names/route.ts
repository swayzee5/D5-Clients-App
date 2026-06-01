import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Fix: update exercise names in sessions to match exercise_library exact names
// so the JOIN works correctly and thumbnails/videos appear
const NAME_FIXES: { from: string; to: string }[] = [
  { from: "Dips pectoraux", to: "Dips sur banc" },
  { from: "Développé militaire haltères", to: "Développé militaire haltères debout" },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") !== "0";

  const results = [];
  for (const fix of NAME_FIXES) {
    const { rows: count } = await pool.query(
      `SELECT COUNT(*) FROM exercises WHERE LOWER(TRIM(name)) = LOWER($1)`,
      [fix.from]
    );
    const n = parseInt(count[0].count);

    if (!dry && n > 0) {
      await pool.query(
        `UPDATE exercises SET name = $1 WHERE LOWER(TRIM(name)) = LOWER($2)`,
        [fix.to, fix.from]
      );
    }
    results.push({ from: fix.from, to: fix.to, affected: n, applied: !dry && n > 0 });
  }

  return NextResponse.json({
    mode: dry ? "dry-run (add ?dry=0 to apply)" : "applied",
    fixes: results,
  });
}
