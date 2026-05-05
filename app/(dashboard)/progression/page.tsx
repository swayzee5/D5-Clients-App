import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { TrendingUp } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Progression",
}

export default async function ProgressionPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progression</h1>
        <p className="text-d5-muted text-sm mt-1">Poids, mensurations &amp; photos</p>
      </div>

      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-400/10 flex items-center justify-center mb-4">
          <TrendingUp size={28} className="text-violet-400" />
        </div>
        <p className="text-white font-semibold">Commence à tracker ta progression</p>
        <p className="text-d5-muted text-sm mt-1">
          Tes premières mesures apparaîtront ici
        </p>
      </div>
    </div>
  )
}
