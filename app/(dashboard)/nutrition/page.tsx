import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getNutritionFiles } from "@/lib/queries/nutrition"
import { NutritionFileCard } from "@/components/nutrition/NutritionFileCard"
import { Utensils } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Nutrition",
}

export default async function NutritionPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const files = await getNutritionFiles(session.user.id)
  const latest = files[0] ?? null
  const history = files.slice(1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nutrition</h1>
        <p className="text-d5-muted text-sm mt-1">Ton plan alimentaire personnalisé</p>
      </div>

      {files.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Plan actuel */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-d5-muted uppercase tracking-wider">
              Plan actuel
            </h2>
            <NutritionFileCard file={latest} featured />
          </section>

          {/* Historique */}
          {history.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-d5-muted uppercase tracking-wider">
                Historique
              </h2>
              <div className="space-y-2">
                {history.map((file) => (
                  <NutritionFileCard key={file.id} file={file} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 flex items-center justify-center mb-4">
        <Utensils size={28} className="text-emerald-400" />
      </div>
      <p className="text-white font-semibold">Plan alimentaire à venir</p>
      <p className="text-d5-muted text-sm mt-1 max-w-xs">
        Ton coach te préparera un plan nutritionnel personnalisé. Il apparaitra ici dès qu&apos;il
        sera prêt.
      </p>
    </div>
  )
}
