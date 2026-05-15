"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle, ChevronDown, ChevronUp, Zap, Clock, ArrowRight } from "lucide-react"

const RPE_LABELS = [
  "Repos total", "Très léger", "Léger", "Modéré léger", "Modéré",
  "Modéré intense", "Intense", "Très intense", "Difficile", "Très difficile", "Maximum absolu",
]

function formatDuration(seconds: number | null): string {
  if (!seconds) return ""
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`
}

function rpeColor(rpe: number): string {
  if (rpe <= 4) return "text-emerald-400"
  if (rpe <= 7) return "text-amber-400"
  return "text-red-400"
}

function rpeBg(rpe: number): string {
  if (rpe <= 4) return "bg-emerald-400/10 border-emerald-400/20"
  if (rpe <= 7) return "bg-amber-400/10 border-amber-400/20"
  return "bg-red-400/10 border-red-400/20"
}

type Activity = {
  id: string
  name: string
  completed_at: string
  duration_seconds: number | null
  rpe: number | null
  source: string
  training_session_id: string | null
  program_id: string | null
}

function ActiviteCard({ a }: { a: Activity }) {
  const [open, setOpen] = useState(false)
  const time = new Date(a.completed_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const sessionHref =
    a.source !== "libre" && a.program_id && a.training_session_id
      ? `/programme/${a.program_id}/seance/${a.training_session_id}`
      : null

  return (
    <div className="card overflow-hidden transition-all">
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 text-left"
      >
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
        <div className="text-d5-muted flex-shrink-0 ml-1">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded details */}
      {open && (
        <div className="mt-3 pt-3 border-t border-d5-border space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {a.duration_seconds ? (
              <div className="bg-d5-surface-2 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <Clock size={14} className="text-d5-muted" />
                <div>
                  <p className="text-[10px] text-d5-muted">Durée</p>
                  <p className="text-white text-sm font-semibold">{formatDuration(a.duration_seconds)}</p>
                </div>
              </div>
            ) : null}
            {a.rpe !== null && a.rpe !== undefined && (
              <div className={`rounded-xl px-3 py-2.5 flex items-center gap-2 border ${rpeBg(a.rpe)}`}>
                <Zap size={14} className={rpeColor(a.rpe)} />
                <div>
                  <p className="text-[10px] text-d5-muted">Effort</p>
                  <p className={`text-sm font-semibold ${rpeColor(a.rpe)}`}>
                    {RPE_LABELS[a.rpe]}
                  </p>
                </div>
              </div>
            )}
          </div>

          {sessionHref && (
            <Link
              href={sessionHref}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-d5-gold/10 border border-d5-gold/20 hover:bg-d5-gold/20 transition-colors"
            >
              <span className="text-d5-gold text-sm font-semibold">Voir la séance</span>
              <ArrowRight size={14} className="text-d5-gold" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export function ActivitesList({ groups }: {
  groups: { label: string; items: Activity[] }[]
}) {
  return (
    <div className="space-y-5">
      {groups.map(({ label, items }) => (
        <div key={label} className="space-y-2">
          <p className="text-xs text-d5-muted font-semibold uppercase tracking-wider capitalize">
            {label}
          </p>
          {items.map((a) => (
            <ActiviteCard key={a.id} a={a} />
          ))}
        </div>
      ))}
    </div>
  )
}
