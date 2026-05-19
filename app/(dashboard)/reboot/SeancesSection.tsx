"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Dumbbell, Clock, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import type { RebootSession } from "@/lib/queries/reboot";

type MuscleConfig = { label: string; desc: string; icon: string };

export function SeancesSection({
  muscleGroupKeys,
  sessionsByMuscle,
  muscleConfig,
  sessionsCompleted,
  sessionsTotal,
}: {
  muscleGroupKeys: string[];
  sessionsByMuscle: Record<string, RebootSession[]>;
  muscleConfig: Record<string, MuscleConfig>;
  sessionsCompleted: number;
  sessionsTotal: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="space-y-2">
      {/* Header toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-1"
      >
        <h2 className="text-white font-semibold text-sm">Mes séances</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-d5-muted">{sessionsCompleted}/{sessionsTotal} complétées</span>
          {isOpen
            ? <ChevronUp size={14} className="text-d5-muted" />
            : <ChevronDown size={14} className="text-d5-muted" />}
        </div>
      </button>

      {/* Collapsed summary */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="w-full text-left">
          <div className="card flex items-center gap-3 hover:border-d5-gold/30 transition-all active:scale-[0.98]">
            <div className="w-9 h-9 rounded-xl bg-d5-surface-2 flex items-center justify-center shrink-0">
              <Dumbbell size={16} className="text-d5-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{sessionsTotal} séances disponibles</p>
              <p className="text-d5-muted text-xs">
                {sessionsCompleted > 0
                  ? `${sessionsCompleted} complétée${sessionsCompleted > 1 ? "s" : ""} · `
                  : ""}
                {muscleGroupKeys
                  .map((k) => muscleConfig[k]?.label ?? k)
                  .slice(0, 4)
                  .join(" · ")}{muscleGroupKeys.length > 4 ? " · …" : ""}
              </p>
            </div>
            <ChevronDown size={14} className="text-d5-muted shrink-0" />
          </div>
        </button>
      )}

      {/* Expanded list */}
      {isOpen && (
        <div className="space-y-2">
          {muscleGroupKeys.map((key) => {
            const cfg = muscleConfig[key] ?? { label: key, desc: "", icon: "🏋️" };
            const groupSessions = sessionsByMuscle[key] ?? [];
            const s = groupSessions[0];
            if (!s) return null;
            const done = s.completed;

            return (
              <Link key={key} href={`/reboot/${s.id}`}>
                <div className={`card flex items-center gap-3 transition-all active:scale-[0.98] ${
                  done
                    ? "border-green-500/20 bg-green-500/5"
                    : "hover:border-d5-gold/30"
                }`}>
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    done ? "bg-green-500/10" : "bg-d5-surface-2"
                  }`}>
                    {done
                      ? <CheckCircle2 size={18} className="text-green-400" />
                      : <span className="text-xl">{cfg.icon}</span>}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`font-semibold text-sm truncate ${
                        done ? "text-gray-400" : "text-white"
                      }`}>{cfg.label}</p>
                      {!done && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 shrink-0">
                          Salle
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-d5-muted">
                      {s.exercise_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Dumbbell size={10} />{s.exercise_count} exercices
                        </span>
                      )}
                      {s.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} />{s.duration_minutes} min
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right */}
                  {done
                    ? <span className="text-xs text-green-400 font-medium shrink-0">Complétée ✓</span>
                    : <ChevronRight size={15} className="text-d5-muted shrink-0" />}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
