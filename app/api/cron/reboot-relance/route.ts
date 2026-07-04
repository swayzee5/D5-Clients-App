import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { sendPushToClient } from "@/lib/push";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    cronSecret &&
    req.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Clients who started (>= 1 task) but haven't finished (< 10),
    // inactive for 3+ days, and not relanced in the last 5 days
    const { rows } = await pool.query(`
      WITH task_counts AS (
        SELECT client_id, MAX(last_activity) AS last_activity, SUM(cnt) AS total
        FROM (
          SELECT client_id::text AS client_id, MAX(completed_at) AS last_activity, COUNT(*) AS cnt
            FROM reboot_completions GROUP BY client_id
          UNION ALL
          SELECT client_id, MAX(completed_at), COUNT(*)
            FROM reboot_task_completions GROUP BY client_id
          UNION ALL
          SELECT client_id, MAX(sent_at), COUNT(*)
            FROM reboot_whatsapp_completions GROUP BY client_id
        ) t
        GROUP BY client_id
      ),
      already_notified AS (
        SELECT client_id FROM push_notification_log
        WHERE notification_type = 'reboot_relance'
          AND sent_at > NOW() - INTERVAL '5 days'
      )
      SELECT tc.client_id, tc.total::int AS total
      FROM task_counts tc
      WHERE tc.total >= 1
        AND tc.total < 10
        AND tc.last_activity < NOW() - INTERVAL '3 days'
        AND tc.client_id NOT IN (SELECT client_id FROM already_notified)
    `);

    let sent = 0;
    for (const row of rows) {
      const total = row.total as number;
      const remaining = 10 - total;
      const message =
        total <= 3
          ? "Tu as démarré quelque chose. Ne t’arrête pas maintenant."
          : `Tu es à ${remaining} tâche${remaining > 1 ? "s" : ""} du bout. Ce serait dommage de s’arrêter là.`;

      await sendPushToClient(row.client_id, "D5 Coaching", message);

      // Upsert sent_at so the 5-day window resets on each send
      await pool
        .query(
          `INSERT INTO push_notification_log (client_id, notification_type)
           VALUES ($1, 'reboot_relance')
           ON CONFLICT (client_id, notification_type) DO UPDATE SET sent_at = NOW()`,
          [row.client_id]
        )
        .catch(() => {});

      sent++;
    }

    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("[reboot-relance cron]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
