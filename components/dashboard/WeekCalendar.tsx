"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const DAY_LABELS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"]

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

export function WeekCalendar() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(now)

  const baseMonday = getMonday(now)
  const offsetMonday = new Date(baseMonday)
  offsetMonday.setDate(baseMonday.getDate() + weekOffset * 7)
  const weekDays = getWeekDays(offsetMonday)

  return (
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
  )
}
