import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getNutritionFiles } from "@/lib/queries/nutrition"
import { pool } from "@/lib/db"
import { NutritionFileCard } from "@/components/nutrition/NutritionFileCard"
import { Utensils, Lock } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Nutrition" }

export default async function NutritionPage() {
  const session = await auth()
  if (!session) redirect("/login")

  let isRebootOnly = false;
  try {
    const r = await pool.query("SELECT is_reboot_only FROM clients WHERE id = $1", [session.user?.id]);
    isRebootOnly = r.rows[0]?.is_reboot_only ?? false;
  } catch {}

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
        isRebootOnly ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-700/40 flex items-center justify-center mb-4">
              <Lock size={28} className="text-gray-500" />
            </div>
            <p className="text-white font-semibold">Disponible dans l&apos;accompagnement coaching</p>
            <p className="text-d5-muted text-sm mt-1 max-w-xs">
              Les plans nutritionnels personnalisés font partie du suivi coaching individuel. Contacte ton coach pour en savoir plus.
            </p>
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 flex items-center justify-center mb-4">
              <Utensils size={28} className="text-emerald-400" />
            </div>
            <p className="text-white font-semibold">Plan alimentaire à venir</p>
            <p className="text-d5-muted text-sm mt-1 max-w-xs">
              Ton coach te préparera un plan nutritionnel personnalisé. Il apparaêtra ici dès qu&apos;il sera prêt.
            </p>
          </div>
        )
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-d5-muted uppercase tracking-wider">Plan actuel</h2>
            <NutritionFileCard file={latest} featured />
          </section>
          {history.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-d5-muted uppercase tracking-wider">Historique</h2>
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
