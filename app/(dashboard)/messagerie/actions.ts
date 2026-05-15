"use server"

import { auth } from "@/auth"
import { pool } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function ensureMessagesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL,
      sender_role VARCHAR(10) NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})
}

export async function sendMessage(content: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  await ensureMessagesTable()

  await pool.query(
    `INSERT INTO messages (client_id, sender_role, content) VALUES ($1, 'client', $2)`,
    [session.user.id, content.trim()]
  )

  revalidatePath("/messagerie")
}

export async function markCoachMessagesRead(clientId: string): Promise<void> {
  await pool.query(
    `UPDATE messages SET is_read = true WHERE client_id = $1 AND sender_role = 'coach' AND is_read = false`,
    [clientId]
  ).catch(() => {})
}
