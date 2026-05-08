"use server";

import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function completeSession(clientId: string, sessionId: string) {
  await pool.query(
    `INSERT INTO reboot_completions (client_id, session_id)
     VALUES ($1, $2)
     ON CONFLICT (client_id, session_id) DO NOTHING`,
    [clientId, sessionId]
  );
  revalidatePath("/reboot");
  revalidatePath(`/reboot/${sessionId}`);
}
