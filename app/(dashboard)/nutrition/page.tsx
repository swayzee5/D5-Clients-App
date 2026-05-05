import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Utensils } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Nutrition",
}

export default async function NutritionPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nutrition</h1>
        <p className="text-d5-muted text-sm mt-1">Ton plan alimentaire personnalisé</p>
      </div>

      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 flex items-center justify-center mb-4">
          <Utensils size={28} className="text-emerald-400" />
        </div>
        <p className="text-white font-semibold">Plan alimentaire en cours de création</p>
        <p className="text-d5-muted text-sm mt-1">
          Ton coach va bientôt te préparer un plan nutritionnel adapté
        </p>
      </div>
    </div>
  )
}
