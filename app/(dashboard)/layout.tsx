import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/navigation/BottomNav"
import { pool } from "@/lib/db"
import { PushInit } from "@/components/PushInit"
import { needsRebootDiagnostic } from "@/lib/queries/reboot-diagnostic"
import { RebootDiagnosticModal } from "@/components/reboot/RebootDiagnosticModal"

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

  // Diagnostic Reboot 40 : tant qu'il n'est pas rempli, on rend le formulaire
  // À LA PLACE du tableau de bord, et non par-dessus. Rien d'autre n'est monté,
  // donc rien d'autre n'est atteignable — ni par la navigation, ni au clavier.
  // Ne concerne que les participants Reboot ; pour tous les autres clients,
  // needsRebootDiagnostic renvoie false et rien ne change.
  if (await needsRebootDiagnostic(session.user.id)) {
    return <RebootDiagnosticModal firstName={session.user?.name?.split(" ")[0]} />
  }

  const unreadMessages = await getUnreadCount(session.user.id)

  return (
    <div className="h-app flex flex-col overflow-hidden bg-d5-bg">
      <Header userName={session.user?.name} />
      {/* Le scroll se fait ici, pas sur le body : la WKWebView de Capacitor
          gère les sous-scrollers même quand le scroll natif est coupé. */}
      <main className="flex-1 scroll-y">
        <div className="pb-28 pt-4 px-4 max-w-lg mx-auto">
          {children}
        </div>
      </main>
      <BottomNav unreadMessages={unreadMessages} />
      <PushInit clientId={session.user.id} />
    </div>
  )
}
