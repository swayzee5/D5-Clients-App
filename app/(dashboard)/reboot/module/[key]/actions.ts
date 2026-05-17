"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
  } catch (err) {
    console.error("[validateModule]", err);
    return;
  }

  revalidatePath("/reboot");
  revalidatePath(`/reboot/module/${taskKey}`);
}
