import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Dumbbell } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Programme",
}

export default async function ProgrammePage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Programme</h1>
        <p className="text-d5-muted text-sm mt-1">Tes séances d&apos;entraînement</p>
      </div>

      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-400/10 flex items-center justify-center mb-4">
          <Dumbbell size={28} className="text-blue-400" />
        </div>
        <p className="text-white font-semibold">Programme en cours de configuration</p>
        <p className="text-d5-muted text-sm mt-1">
          Ton coach va bientôt te créer un programme personnalisé
        </p>
      </div>
    </div>
  )
}
