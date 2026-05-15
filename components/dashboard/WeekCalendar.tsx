"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const DAY_LABELS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"]

export type CompletedSession = {
  id: string
  name: string
  completed_at: string
  duration_seconds: number | null
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  )
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ""
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`
}

export function WeekCalendar({ completedSessions = [] }: { completedSessions?: CompletedSession[] }) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(now)

  const baseMonday = getMonday(now)
  const offsetMonday = new Date(baseMonday)
  offsetMonday.setDate(baseMonday.getDate() + weekOffset * 7)
  const weekDays = getWeekDays(offsetMonday)

  // Build a map: dateKey -> CompletedSession[]
  const sessionMap = new Map<string, CompletedSession[]>()
  for (const s of completedSessions) {
    const d = new Date(s.completed_at)
    const k = dateKey(d)
    if (!sessionMap.has(k)) sessionMap.set(k, [])
    sessionMap.get(k)!.push(s)
  }

  const selectedKey = dateKey(selectedDate)
  const sessionsForSelected = sessionMap.get(selectedKey) ?? []

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="p-2 rounded-xl text-d5-muted hover:text-white hover:bg-d5-surface-2 transition-colors flex-shrink-0"
          aria-label="Semaine précédente"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex-1 grid grid-cols-7">
          {weekDays.map((date, i) => {
            const isSelected = isSameDay(date, selectedDate)
            const isToday = isSameDay(date, now)
            const k = dateKey(date)
            const hasSessions = sessionMap.has(k)
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(new Date(date))}
                className="flex flex-col items-center gap-1.5 py-1"
              >
                <span className="text-[9px] text-d5-muted font-semibold tracking-wider">
                  {DAY_LABELS[i]}
                </span>
                <span
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                    isSelected
                      ? "bg-d5-gold text-black"
                      : isToday
                      ? "border border-d5-gold/60 text-d5-gold"
                      : "text-gray-300 hover:bg-d5-surface-2"
                  )}
                >
                  {date.getDate()}
                </span>
                {hasSessions && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="p-2 rounded-xl text-d5-muted hover:text-white hover:bg-d5-surface-2 transition-colors flex-shrink-0"
          aria-label="Semaine suivante"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Selected day sessions */}
      <div className="mt-4 pt-3 border-t border-d5-border space-y-2">
        {sessionsForSelected.length === 0 ? (
          <p className="text-d5-muted text-sm">Aucune séance ce jour</p>
        ) : (
          sessionsForSelected.map((s) => {
            const completedAt = new Date(s.completed_at)
            const timeStr = completedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
            return (
              <div key={s.id} className="flex items-center gap-3">
                <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{s.name}</p>
                  <p className="text-d5-muted text-xs">
                    {timeStr}{s.duration_seconds ? ` · ${formatDuration(s.duration_seconds)}` : ""}
                  </p>
                </div>
                <span className="text-xs text-emerald-400 font-semibold flex-shrink-0">✓ Terminé</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
