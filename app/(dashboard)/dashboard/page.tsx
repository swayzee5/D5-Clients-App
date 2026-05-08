import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Dumbbell, Utensils, Zap, ArrowRight, Lock } from "lucide-react"
import { WeekCalendar } from "@/components/dashboard/WeekCalendar"
import { pool } from "@/lib/db"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Tableau de bord",
}

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  if (hour < 12) return `Bonjour, ${name} !`
  if (hour < 18) return `Bon après-midi, ${name} !`
  return `Bonsoir, ${name} !`
}

async function getDashboardCounts(clientId: string) {
  const [programs, nutrition] = await Promise.all([
    pool.query(
      "SELECT COUNT(*) FROM training_programs WHERE client_id = $1 AND is_active = true",
      [clientId]
    ),
    pool.query(
      "SELECT COUNT(*) FROM nutrition_files WHERE client_id = $1 AND is_active = true",
      [clientId]
    ),
  ])
  return {
    hasProgram: parseInt(programs.rows[0].count) > 0,
    hasNutrition: parseInt(nutrition.rows[0].count) > 0,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const firstName = session.user?.name?.split(" ")[0] ?? "Athlète"
  const isRebootOnly = session.user?.isRebootOnly ?? false
  const { hasProgram, hasNutrition } = await getDashboardCounts(session.user.id)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-white">{getGreeting(firstName)}</h1>
      </div>

      {/* Weekly calendar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Mes séances</h2>
          <Link href="/programme" className="text-d5-gold text-sm font-medium">Voir tout</Link>
        </div>
        <div className="card pt-3 pb-2">
          <WeekCalendar />
          <div className="mt-4 pt-3 border-t border-d5-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-d5-surface-2 flex items-center justify-center flex-shrink-0">
              <Dumbbell size={15} className="text-d5-muted" />
            </div>
            <p className="text-d5-muted text-sm">Aucune séance planifiée</p>
          </div>
        </div>
      </section>

      {/* Programmes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Mes programmes</h2>
          {hasProgram && (
            <Link href="/programme" className="text-d5-gold text-sm font-medium">Voir tout</Link>
          )}
        </div>
        {hasProgram ? (
          <Link href="/programme">
            <div className="card flex items-center gap-3 hover:border-d5-gold/30 transition-colors active:scale-[0.98]">
              <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center flex-shrink-0">
                <Dumbbell size={18} className="text-blue-400" />
              </div>
              <p className="text-white text-sm font-medium flex-1">Voir mon programme</p>
              <ArrowRight size={16} className="text-d5-muted" />
            </div>
          </Link>
        ) : isRebootOnly ? (
          <div className="card flex items-center gap-3 opacity-60 cursor-default">
            <div className="w-10 h-10 rounded-xl bg-d5-surface-2 flex items-center justify-center flex-shrink-0">
              <Lock size={16} className="text-d5-muted" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Programme personnalisé</p>
              <p className="text-d5-muted text-xs mt-0.5">Disponible en coaching complet</p>
            </div>
          </div>
        ) : (
          <Link href="/programme">
            <div className="card flex items-center gap-3 hover:border-d5-gold/30 transition-colors active:scale-[0.98]">
              <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center flex-shrink-0">
                <Dumbbell size={18} className="text-blue-400" />
              </div>
              <p className="text-d5-muted text-sm flex-1">Pas de programme à afficher</p>
              <ArrowRight size={16} className="text-d5-muted" />
            </div>
          </Link>
        )}
      </section>

      {/* Nutrition */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Mes plans de nutrition</h2>
          {hasNutrition && (
            <Link href="/nutrition" className="text-d5-gold text-sm font-medium">Voir tout</Link>
          )}
        </div>
        {hasNutrition ? (
          <Link href="/nutrition">
            <div className="card flex items-center gap-3 hover:border-d5-gold/30 transition-colors active:scale-[0.98]">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                <Utensils size={18} className="text-emerald-400" />
              </div>
              <p className="text-white text-sm font-medium flex-1">Voir mes plans</p>
              <ArrowRight size={16} className="text-d5-muted" />
            </div>
          </Link>
        ) : isRebootOnly ? (
          <div className="card flex items-center gap-3 opacity-60 cursor-default">
            <div className="w-10 h-10 rounded-xl bg-d5-surface-2 flex items-center justify-center flex-shrink-0">
              <Lock size={16} className="text-d5-muted" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Plan nutrition sur mesure</p>
              <p className="text-d5-muted text-xs mt-0.5">Disponible en coaching complet</p>
            </div>
          </div>
        ) : (
          <Link href="/nutrition">
            <div className="card flex items-center gap-3 hover:border-d5-gold/30 transition-colors active:scale-[0.98]">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                <Utensils size={18} className="text-emerald-400" />
              </div>
              <p className="text-d5-muted text-sm flex-1">Pas de plan à afficher</p>
              <ArrowRight size={16} className="text-d5-muted" />
            </div>
          </Link>
        )}
      </section>

      {/* Reboot 40 — visible uniquement pour les clients reboot */}
      {isRebootOnly && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Reboot 40</h2>
            <Link href="/reboot" className="text-d5-gold text-sm font-medium">Voir tout</Link>
          </div>
          <Link href="/reboot">
            <div className="card flex items-center gap-3 hover:border-d5-gold/30 transition-colors active:scale-[0.98]">
              <div className="w-10 h-10 rounded-xl bg-d5-gold/10 flex items-center justify-center flex-shrink-0">
                <Zap size={18} className="text-d5-gold" />
              </div>
              <p className="text-d5-muted text-sm flex-1">Challenge 7 jours — Démarre ta transformation</p>
              <ArrowRight size={16} className="text-d5-muted" />
            </div>
          </Link>
        </section>
      )}
    </div>
  )
}
