"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function notifyIfChallengeComplete(clientId: string) {
  try {
    const [{ rows: sRows }, { rows: mRows }] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT rs.muscle_group) AS cnt
         FROM reboot_completions rc
         JOIN reboot_sessions rs ON rc.session_id = rs.id
         WHERE rc.client_id = $1::uuid`,
        [clientId]
      ),
      pool.query(
        `SELECT COUNT(*) AS cnt FROM reboot_task_completions WHERE client_id = $1`,
        [clientId]
      ),
    ]);
    const total = parseInt(sRows[0]?.cnt ?? 0) + parseInt(mRows[0]?.cnt ?? 0);
    if (total >= 7) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS coach_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id TEXT NOT NULL,
          type TEXT NOT NULL,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(client_id, type)
        )
      `);
      await pool.query(
        `INSERT INTO coach_notifications (client_id, type) VALUES ($1, 'reboot_completed') ON CONFLICT DO NOTHING`,
        [clientId]
      );
    }
  } catch (err) {
    console.error("[notifyIfChallengeComplete]", err);
  }
}

export async function validateModule(taskKey: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reboot_task_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id TEXT NOT NULL,
        task_key TEXT NOT NULL,
        completed_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(client_id, task_key)
      )
    `);
    await pool.query(
      `INSERT INTO reboot_task_completions (client_id, task_key)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [session.user.id, taskKey]
    );
    await notifyIfChallengeComplete(session.user.id);
  } catch (err) {
    console.error("[validateModule]", err);
    return;
  }

  revalidatePath("/reboot");
  revalidatePath(`/reboot/module/${taskKey}`);
}
