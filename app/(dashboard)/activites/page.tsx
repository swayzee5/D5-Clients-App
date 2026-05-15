import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { pool } from "@/lib/db"
import Link from "next/link"
import { CheckCircle, ChevronLeft, Zap } from "lucide-react"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Mes activités",
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ""
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`
}

function rpeColor(rpe: number | null): string {
  if (rpe === null || rpe === undefined) return "text-d5-muted"
  if (rpe <= 4) return "text-emerald-400"
  if (rpe <= 7) return "text-amber-400"
  return "text-red-400"
}

async function ensureColumns() {
  await pool.query(`ALTER TABLE workout_sessions ALTER COLUMN training_session_id DROP NOT NULL`).catch(() => {})
  await pool.query(`ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS activity_type VARCHAR(100)`).catch(() => {})
  await pool.query(`ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'programme'`).catch(() => {})
}

async function getAllActivities(clientId: string) {
  try {
    await ensureColumns()
    const result = await pool.query(
      `SELECT ws.id, ws.completed_at, ws.duration_seconds, ws.rpe,
              COALESCE(ws.activity_type, ts.name, 'Séance') AS name,
              COALESCE(ws.source, 'programme') AS source
       FROM workout_sessions ws
       LEFT JOIN training_sessions ts ON ts.id = ws.training_session_id
       WHERE ws.client_id = $1 AND ws.status = 'completed'
       ORDER BY ws.completed_at DESC
       LIMIT 200`,
      [clientId]
    )
    return result.rows
  } catch {
    return []
  }
}

export default async function ActivitesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const activities = await getAllActivities(session.user.id)

  const groups: { label: string; items: typeof activities }[] = []
  const seen = new Map<string, number>()
  for (const a of activities) {
    const date = new Date(a.completed_at)
    const label = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    if (!seen.has(label)) {
      seen.set(label, groups.length)
      groups.push({ label, items: [] })
    }
    groups[seen.get(label)!].items.push(a)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pt-1">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-xl text-d5-muted hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black text-white">Mes activités</h1>
      </div>

      {activities.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-d5-muted text-sm">Aucune activité enregistrée</p>
          <Link
            href="/activite/nouvelle"
            className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-d5-gold text-black text-sm font-bold"
          >
            Logger une activité
          </Link>
        </div>
      ) : (
        groups.map(({ label, items }) => (
          <div key={label} className="space-y-2">
            <p className="text-xs text-d5-muted font-semibold uppercase tracking-wider capitalize">
              {label}
            </p>
            {items.map((a) => {
              const time = new Date(a.completed_at).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })
              return (
                <div key={a.id} className="card flex items-center gap-3">
                  <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{a.name}</p>
                    <p className="text-d5-muted text-xs">
                      {time}
                      {a.duration_seconds ? ` · ${formatDuration(a.duration_seconds)}` : ""}
                      {a.source === "libre" ? " · Activité libre" : ""}
                    </p>
                  </div>
                  {a.rpe !== null && a.rpe !== undefined && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Zap size={12} className={rpeColor(a.rpe)} />
                      <span className={`text-xs font-bold ${rpeColor(a.rpe)}`}>{a.rpe}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
