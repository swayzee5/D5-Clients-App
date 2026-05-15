import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { pool } from "@/lib/db"
import { ChatView } from "./ChatView"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Messagerie",
}

export default async function MessageriePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const clientId = session.user.id

  // Create table if needed
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

  // Mark coach messages as read
  await pool.query(
    `UPDATE messages SET is_read = true
     WHERE client_id = $1 AND sender_role = 'coach' AND is_read = false`,
    [clientId]
  ).catch(() => {})

  // Fetch all messages for this client
  const result = await pool.query(
    `SELECT id, sender_role, content, created_at
     FROM messages
     WHERE client_id = $1
     ORDER BY created_at ASC`,
    [clientId]
  ).catch(() => ({ rows: [] }))

  return (
    <div className="flex flex-col h-full">
      <div className="pt-1 pb-4">
        <h1 className="text-2xl font-black text-white">Mon coach</h1>
        <p className="text-d5-muted text-xs mt-0.5">Conversation privée</p>
      </div>
      <ChatView messages={result.rows} />
    </div>
  )
}
