import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/navigation/BottomNav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-dvh bg-d5-bg">
      <Header userName={session.user?.name} />
      <main className="pb-28 pt-4 px-4 max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
