import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { sendPushToClient } from "@/lib/push";

const MESSAGES = [
  "La constance à 40 ans vaut plus que l’intensité à 20.",
  "Tu n’es pas en train de te remettre en forme. Tu construis une nouvelle version de toi.",
  "Chaque séance compte. Même les petites. Surtout les petites.",
  "Ton meilleur investissement ? Ton corps. Prends soin de lui.",
  "La discipline n’est pas une punition. C’est la liberté que tu te donnes.",
];

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    cronSecret &&
    req.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Rotate message by week number
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const message = MESSAGES[weekNumber % MESSAGES.length];

    // Target clients who started but haven't finished the Reboot
    const { rows } = await pool.query(`
      SELECT client_id FROM (
        SELECT client_id::text AS client_id, COUNT(*) AS cnt
          FROM reboot_completions GROUP BY client_id
        UNION ALL
        SELECT client_id, COUNT(*) FROM reboot_task_completions GROUP BY client_id
        UNION ALL
        SELECT client_id, COUNT(*) FROM reboot_whatsapp_completions GROUP BY client_id
      ) t
      GROUP BY client_id
      HAVING SUM(cnt) >= 1 AND SUM(cnt) < 10
    `);

    let sent = 0;
    for (const row of rows) {
      await sendPushToClient(row.client_id, "D5 Coaching", message);
      sent++;
    }

    return NextResponse.json({ ok: true, sent, message });
  } catch (err) {
    console.error("[motivation-hebdo cron]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
