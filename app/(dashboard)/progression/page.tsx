import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProgressEntries } from "@/lib/queries/progression"
import { ProgressionView } from "@/components/progression/ProgressionView"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Progression",
}

export default async function ProgressionPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const entries = await getProgressEntries(session.user.id)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Ma progression</h1>
        <p className="text-d5-muted text-sm mt-1">Poids &amp; mensurations</p>
      </div>
      <ProgressionView entries={entries} />
    </div>
  )
}
