import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/navigation/BottomNav"
import { pool } from "@/lib/db"

async function getUnreadCount(clientId: string): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM messages
       WHERE client_id = $1 AND sender_role = 'coach' AND is_read = false`,
      [clientId]
    )
    return parseInt(result.rows[0].count) || 0
  } catch {
    return 0
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const unreadMessages = await getUnreadCount(session.user.id)

  return (
    <div className="min-h-dvh bg-d5-bg">
      <Header userName={session.user?.name} />
      <main className="pb-28 pt-4 px-4 max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav unreadMessages={unreadMessages} />
    </div>
  )
}
