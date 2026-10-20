import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getNutritionFiles } from "@/lib/queries/nutrition"
import { NutritionFileCard } from "@/components/nutrition/NutritionFileCard"
import { listerRepas } from "@/lib/queries/journal-repas"
import { dernierEnvoi } from "@/lib/queries/nutrition-suivi"
import { joursAvantPoint, pointDu } from "@/lib/nutrition-suivi"
import { Utensils, Camera, ArrowRight, ClipboardList } from "lucide-react"
import Link from "next/link"
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
  const repas = await listerRepas(session.user.id, 3).catch(() => [])
  const suivi = await dernierEnvoi(session.user.id).catch(() => null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nutrition</h1>
        <p className="text-d5-muted text-sm mt-1">Profil, journal de repas &amp; plan</p>
      </div>

      {/* L'ordre est délibéré, et il place le plan en dernier. Le profil
          conditionne tout le reste — sans lui le coach écrit à l'aveugle. Le
          journal se nourrit tous les jours, c'est lui qui fait revenir. Le
          plan, lui, se consulte une fois. */}
      <ProfilEntree suivi={suivi} />

      <JournalEntree
        derniers={repas.length}
        enAttente={repas.filter((r) => r.statut !== "repondu").length}
      />

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

/**
 * L'entrée du journal photo.
 *
 * Le libellé change selon l'état, parce qu'une carte qui dit toujours la même
 * chose cesse d'être lue au bout de trois jours.
 */
function JournalEntree({ derniers, enAttente }: { derniers: number; enAttente: number }) {
  return (
    <Link
      href="/nutrition/journal"
      className="flex items-center gap-4 rounded-2xl border-2 border-d5-gold/40 bg-d5-gold/5 p-5 transition-transform active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-d5-gold/15">
        <Camera size={22} className="text-d5-gold" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-white">Mon journal de repas</p>
        <p className="mt-0.5 text-xs leading-relaxed text-d5-muted">
          {derniers === 0
            ? "Photographie ton assiette, je te réponds. Rien d'autre à remplir."
            : enAttente > 0
              ? `${enAttente} repas en attente de ma réponse.`
              : "Tous tes repas ont une réponse. Continue."}
        </p>
      </div>
      <ArrowRight size={18} className="shrink-0 text-d5-gold" />
    </Link>
  )
}

/**
 * L'entrée du profil alimentaire.
 *
 * Trois états, et un seul appelle une action : jamais rempli, point dû,
 * à jour. Dans le dernier cas la carte reste visible mais discrète — la faire
 * disparaître laisserait croire que le profil n'existe plus.
 */
function ProfilEntree({
  suivi,
}: {
  suivi: { envoyeLe: Date } | null
}) {
  const maintenant = new Date()
  const aFaire = !suivi || pointDu(suivi.envoyeLe, maintenant)
  const jours = suivi ? joursAvantPoint(suivi.envoyeLe, maintenant) : 0

  return (
    <Link
      href="/nutrition/profil"
      className={`flex items-center gap-4 rounded-2xl p-5 transition-transform active:scale-[0.98] ${
        aFaire
          ? "border-2 border-d5-gold/40 bg-d5-gold/5"
          : "card hover:border-d5-gold/30"
      }`}
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
        aFaire ? "bg-d5-gold/15" : "bg-d5-surface-2"
      }`}>
        <ClipboardList size={22} className={aFaire ? "text-d5-gold" : "text-d5-muted"} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-white">
          {!suivi
            ? "Mon profil alimentaire"
            : aFaire
              ? "Ton point de six semaines"
              : "Mon profil alimentaire"}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-d5-muted">
          {!suivi
            ? "Huit questions, deux minutes. C'est ce qui me permet d'écrire un plan que tu pourras suivre."
            : aFaire
              ? "Cinq questions pour ajuster ce qui coince."
              : `À jour. Prochain point dans ${jours} jour${jours > 1 ? "s" : ""}.`}
        </p>
      </div>
      <ArrowRight size={18} className={aFaire ? "shrink-0 text-d5-gold" : "shrink-0 text-d5-muted"} />
    </Link>
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
