import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Dumbbell, Utensils, Zap, ArrowRight, Lock } from "lucide-react"
import { WeekCalendar } from "@/components/dashboard/WeekCalendar"
import type { CompletedSession } from "@/components/dashboard/WeekCalendar"
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

async function getCompletedSessionsThisWeek(clientId: string): Promise<CompletedSession[]> {
  try {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const result = await pool.query(
      `SELECT ws.id, COALESCE(ts.name, 'Séance') AS name, ws.completed_at, ws.duration_seconds
       FROM workout_sessions ws
       LEFT JOIN training_sessions ts ON ts.id = ws.training_session_id
       WHERE ws.client_id = $1
         AND ws.status = 'completed'
         AND ws.completed_at >= $2
         AND ws.completed_at <= $3
       ORDER BY ws.completed_at ASC`,
      [clientId, monday.toISOString(), sunday.toISOString()]
    )
    return result.rows as CompletedSession[]
  } catch {
    return []
  }
}

async function getRebootProgress(clientId: string) {
  try {
    const [seances, wa, modules] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM reboot_completions WHERE client_id = $1", [clientId]),
      pool.query("SELECT COUNT(*) FROM reboot_whatsapp_completions WHERE client_id = $1", [clientId]),
      pool.query("SELECT COUNT(*) FROM reboot_task_completions WHERE client_id = $1", [clientId]),
    ])
    const s = Math.min(parseInt(seances.rows[0].count), 3)
    const w = Math.min(parseInt(wa.rows[0].count), 3)
    const m = Math.min(parseInt(modules.rows[0].count), 4)
    return { done: s + w + m, total: 10 }
  } catch {
    return { done: 0, total: 10 }
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const firstName = session.user?.name?.split(" ")[0] ?? "Athlète"
  const isRebootOnly = session.user?.isRebootOnly ?? false

  const [{ hasProgram, hasNutrition }, completedSessions, rebootProgress] = await Promise.all([
    getDashboardCounts(session.user.id),
    getCompletedSessionsThisWeek(session.user.id),
    isRebootOnly ? getRebootProgress(session.user.id) : Promise.resolve({ done: 0, total: 10 }),
  ])

  const rebootPct = Math.round((rebootProgress.done / rebootProgress.total) * 100)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-white">{getGreeting(firstName)}</h1>
      </div>

      {/* REBOOT HERO — en priorité pour les comptes Reboot */}
      {isRebootOnly && (
        <section>
          <Link href="/reboot">
            <div className="relative rounded-2xl p-[1.5px] overflow-hidden group active:scale-[0.98] transition-transform">
              {/* Bordure gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-d5-gold via-orange-500 to-d5-gold opacity-80 group-hover:opacity-100 transition-opacity" />
              {/* Contenu */}
              <div className="relative rounded-2xl bg-[#1a1200] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-d5-gold/20 flex items-center justify-center">
                      <Zap size={22} className="text-d5-gold" fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-d5-gold text-xs font-semibold uppercase tracking-widest">Challenge</p>
                      <p className="text-white text-lg font-black leading-tight">Reboot 40</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">{rebootProgress.done}<span className="text-d5-muted text-base font-normal">/{rebootProgress.total}</span></p>
                    <p className="text-d5-muted text-xs">tâches</p>
                  </div>
                </div>

                {/* Barre de progression */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-d5-muted">Progression</span>
                    <span className="text-d5-gold font-semibold">{rebootPct}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-d5-gold to-orange-400 rounded-full transition-all"
                      style={{ width: `${rebootPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-d5-muted text-sm">
                    {rebootProgress.done === 0
                      ? "Démarre ta transformation ⚡"
                      : rebootProgress.done === rebootProgress.total
                      ? "Challenge complété 🎉"
                      : `${rebootProgress.total - rebootProgress.done} tâches restantes`}
                  </p>
                  <div className="flex items-center gap-1 text-d5-gold text-sm font-semibold">
                    Voir <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Weekly calendar */}
      {!isRebootOnly && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Mes séances</h2>
            <Link href="/programme" className="text-d5-gold text-sm font-medium">Voir tout</Link>
          </div>
          <div className="card pt-3 pb-2">
            <WeekCalendar completedSessions={completedSessions} />
          </div>
        </section>
      )}

      {/* Programmes — masqué pour reboot */}
      {!isRebootOnly && (
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
      )}

      {/* Nutrition — masqué pour reboot */}
      {!isRebootOnly && (
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
      )}

      {/* Pour les comptes Reboot : accès rapides secondaires */}
      {isRebootOnly && (
        <section className="space-y-3">
          <h2 className="font-semibold text-white text-sm text-d5-muted">Accès rapides</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="card flex items-center gap-3 opacity-50 cursor-default">
              <div className="w-9 h-9 rounded-xl bg-d5-surface-2 flex items-center justify-center flex-shrink-0">
                <Lock size={14} className="text-d5-muted" />
              </div>
              <div>
                <p className="text-white text-xs font-medium">Programme</p>
                <p className="text-d5-muted text-xs">Coaching complet</p>
              </div>
            </div>
            <div className="card flex items-center gap-3 opacity-50 cursor-default">
              <div className="w-9 h-9 rounded-xl bg-d5-surface-2 flex items-center justify-center flex-shrink-0">
                <Lock size={14} className="text-d5-muted" />
              </div>
              <div>
                <p className="text-white text-xs font-medium">Nutrition</p>
                <p className="text-d5-muted text-xs">Coaching complet</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
