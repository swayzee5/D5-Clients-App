import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { pool } from "@/lib/db"
import { ChatView } from "./ChatView"
import { ensureMessagesTable, markCoachMessagesRead } from "./actions"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Messagerie",
}

export default async function MessageriePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  await ensureMessagesTable()
  await markCoachMessagesRead(session.user.id)

  const result = await pool.query(
    `SELECT id, sender_role, content, created_at
     FROM messages
     WHERE client_id = $1
     ORDER BY created_at ASC`,
    [session.user.id]
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
