import { pool } from "@/lib/db";

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID ?? "";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY ?? "";

async function ensureNotificationLog() {
  await pool
    .query(
      `CREATE TABLE IF NOT EXISTS push_notification_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(client_id, notification_type)
      )`
    )
    .catch(() => {});
}

export async function sendPushToClient(
  clientId: string,
  title: string,
  message: string
): Promise<void> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) return;
  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [clientId] },
        target_channel: "push",
        headings: { fr: title, en: title },
        contents: { fr: message, en: message },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[sendPushToClient] OneSignal error:", text);
    }
  } catch (err) {
    console.error("[sendPushToClient]", err);
  }
}

// Returns true if notification is new (first time hitting this milestone)
async function logNotificationOnce(
  clientId: string,
  type: string
): Promise<boolean> {
  await ensureNotificationLog();
  const { rows } = await pool.query(
    `INSERT INTO push_notification_log (client_id, notification_type)
     VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id`,
    [clientId, type]
  );
  return rows.length > 0;
}

const MILESTONES = [
  {
    count: 3,
    type: "reboot_milestone_3",
    message: "3 tâches dans le sac. Tu es sur la bonne voie.",
  },
  {
    count: 5,
    type: "reboot_milestone_5",
    message:
      "Moitié du chemin. La discipline que tu construis maintenant change tout.",
  },
  {
    count: 10,
    type: "reboot_milestone_10",
    message:
      "Reboot terminé. Il est temps de poursuivre l’aventure. La suite t’attend.",
  },
];

export async function checkAndSendMilestoneNotification(
  clientId: string
): Promise<void> {
  try {
    const [{ rows: sRows }, { rows: mRows }, { rows: waRows }] =
      await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS cnt FROM reboot_completions WHERE client_id = $1::uuid`,
          [clientId]
        ),
        pool
          .query(
            `SELECT COUNT(*) AS cnt FROM reboot_task_completions WHERE client_id = $1`,
            [clientId]
          )
          .catch(() => ({ rows: [{ cnt: 0 }] })),
        pool
          .query(
            `SELECT COUNT(*) AS cnt FROM reboot_whatsapp_completions WHERE client_id = $1`,
            [clientId]
          )
          .catch(() => ({ rows: [{ cnt: 0 }] })),
      ]);

    const total =
      parseInt(sRows[0]?.cnt ?? "0") +
      parseInt(mRows[0]?.cnt ?? "0") +
      parseInt(waRows[0]?.cnt ?? "0");

    // Send only milestones not yet sent, highest first to avoid double-notif
    // when two tasks completed close together
    for (const milestone of [...MILESTONES].reverse()) {
      if (total >= milestone.count) {
        const isNew = await logNotificationOnce(clientId, milestone.type);
        if (isNew) {
          await sendPushToClient(clientId, "D5 Coaching", milestone.message);
          // Send only the highest new milestone per action call
          break;
        }
      }
    }
  } catch (err) {
    console.error("[checkAndSendMilestoneNotification]", err);
  }
}
