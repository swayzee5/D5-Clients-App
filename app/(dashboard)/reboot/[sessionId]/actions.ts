"use server";

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
      pool
        .query(`SELECT COUNT(*) AS cnt FROM reboot_task_completions WHERE client_id = $1`, [clientId])
        .catch(() => ({ rows: [{ cnt: 0 }] })),
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

export async function completeSession(clientId: string, sessionId: string) {
  await pool.query(
    `INSERT INTO reboot_completions (client_id, session_id)
     VALUES ($1, $2)
     ON CONFLICT (client_id, session_id) DO NOTHING`,
    [clientId, sessionId]
  );
  await notifyIfChallengeComplete(clientId);
  revalidatePath("/reboot");
  revalidatePath(`/reboot/${sessionId}`);
}

export async function submitSessionCheckin(
  clientId: string,
  sessionId: string,
  energy: number,
  difficulty: string,
  feeling: string
) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reboot_session_checkins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        energy INT,
        difficulty TEXT,
        feeling TEXT,
        submitted_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(client_id, session_id)
      )
    `);
    await pool.query(
      `INSERT INTO reboot_session_checkins (client_id, session_id, energy, difficulty, feeling)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (client_id, session_id) DO NOTHING`,
      [clientId, sessionId, energy, difficulty, feeling || null]
    );
  } catch (err) {
    console.error("[submitSessionCheckin]", err);
  }
}
