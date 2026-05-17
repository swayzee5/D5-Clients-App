export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Zap, CheckCircle2, Dumbbell, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getRebootSessions } from "@/lib/queries/reboot";
import { pool } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reboot 40+" };

const MUSCLE_GROUPS = [
  { key: "pecs",   label: "Pectoraux",    desc: "Poitrine · Épaules avant · Triceps",        icon: "💪" },
  { key: "dos",    label: "Dos & Biceps", desc: "Grand dorsal · Trapèzes · Biceps",          icon: "🏋️" },
  { key: "jambes", label: "Jambes",       desc: "Quadriceps · Ischio-jambiers · Fessiers",   icon: "🦵" },
];

const MODULES = [
  { key: "regularite",  emoji: "🔥", title: "La régularité avant l’intensité", teaser: "Le secret de la transformation durable" },
  { key: "hydratation", emoji: "💧", title: "L’hydratation, ton moteur",        teaser: "2L minimum — comprendre pourquoi" },
  { key: "sommeil",     emoji: "😴", title: "Le sommeil, ton meilleur allié",   teaser: "Quand le vrai travail se fait" },
  { key: "nutrition",   emoji: "🥗", title: "Protéines à chaque repas",          teaser: "La règle simple qui change tout" },
];

export default async function RebootPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const clientId = session.user.id;

  let sessions: Awaited<ReturnType<typeof getRebootSessions>> = [];
  let completedModules: string[] = [];

  try { sessions = await getRebootSessions(clientId); } catch {}

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reboot_task_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id TEXT NOT NULL,
        task_key TEXT NOT NULL,
        completed_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(client_id, task_key)
      )
    `);
    const { rows } = await pool.query(
      `SELECT task_key FROM reboot_task_completions WHERE client_id = $1`,
      [clientId]
    );
    completedModules = rows.map((r: { task_key: string }) => r.task_key);
  } catch {}

  const sessionsByMuscle: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    if (!sessionsByMuscle[s.muscle_group]) sessionsByMuscle[s.muscle_group] = [];
    sessionsByMuscle[s.muscle_group].push(s);
  }

  const sessionsCompleted = MUSCLE_GROUPS.filter(
    (g) => sessionsByMuscle[g.key]?.some((s) => s.completed)
  ).length;
  const modulesCompleted = completedModules.length;
  const totalCompleted = sessionsCompleted + modulesCompleted;
  const totalTasks = 7;
  const progressPct = Math.round((totalCompleted / totalTasks) * 100);
  const allDone = totalCompleted === totalTasks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-d5-gold/20 to-transparent border border-d5-gold/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-d5-gold" />
          <span className="text-d5-gold text-xs font-semibold uppercase tracking-wider">Challenge offert</span>
        </div>
        <h1 className="text-xl font-bold text-white">Reboot 40+</h1>
        <p className="text-gray-400 text-sm mt-0.5">7 étapes pour te remettre en mouvement</p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400">{totalCompleted}/{totalTasks} étapes complétées</span>
            <span className="text-d5-gold font-semibold">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-d5-gold rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Séances */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Mes séances</h2>
          <span className="text-xs text-d5-muted">{sessionsCompleted}/3 complétées</span>
        </div>

        {MUSCLE_GROUPS.map(({ key, label, desc, icon }) => {
          const groupSessions = sessionsByMuscle[key] ?? [];
          const done = groupSessions.some((s) => s.completed);

          return (
            <div
              key={key}
              className={`card transition-all ${
                done ? "border-green-500/20 bg-green-500/5" : "border-d5-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  done ? "bg-green-500/10" : "bg-d5-surface-2"
                }`}>
                  {done
                    ? <CheckCircle2 size={18} className="text-green-400" />
                    : <span className="text-lg">{icon}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${done ? "text-gray-400" : "text-white"}`}>{label}</p>
                  <p className="text-d5-muted text-xs">{desc}</p>
                </div>
                {done && <span className="text-xs text-green-400 font-medium shrink-0">Complétée ✓</span>}
              </div>

              {!done && groupSessions.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {groupSessions.map((s) => (
                    <Link key={s.id} href={`/reboot/${s.id}`}>
                      <div className="rounded-xl p-3 bg-d5-surface-2 border border-d5-border hover:border-d5-gold/30 transition-all active:scale-[0.98]">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                          s.location === "salle"
                            ? "bg-blue-500/15 text-blue-400"
                            : "bg-green-500/15 text-green-400"
                        }`}>
                          {s.location === "salle" ? "Salle" : "Maison"}
                        </span>
                        <p className="text-white text-xs font-medium mt-1.5 leading-snug">{s.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Dumbbell size={10} className="text-d5-muted" />
                          <span className="text-d5-muted text-xs">{s.exercise_count} ex.</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Modules lifestyle */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Modules lifestyle</h2>
          <span className="text-xs text-d5-muted">{modulesCompleted}/4 validés</span>
        </div>

        {MODULES.map(({ key, emoji, title, teaser }) => {
          const done = completedModules.includes(key);
          return (
            <Link key={key} href={`/reboot/module/${key}`}>
              <div className={`card flex items-center gap-3 transition-all active:scale-[0.98] ${
                done
                  ? "border-green-500/20 bg-green-500/5"
                  : "hover:border-d5-gold/30"
              }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  done ? "bg-green-500/10" : "bg-d5-surface-2"
                }`}>
                  {done
                    ? <CheckCircle2 size={18} className="text-green-400" />
                    : <span className="text-lg">{emoji}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${done ? "text-gray-400" : "text-white"}`}>{title}</p>
                  <p className="text-d5-muted text-xs">{done ? "Validé" : teaser}</p>
                </div>
                {done
                  ? <span className="text-xs text-green-400 font-medium shrink-0">✓</span>
                  : <ArrowRight size={15} className="text-d5-muted shrink-0" />
                }
              </div>
            </Link>
          );
        })}
      </section>

      {/* CTA final */}
      {allDone && (
        <div className="card border-d5-gold/30 bg-d5-gold/5 space-y-3">
          <p className="text-white font-bold">🎉 Challenge complété !</p>
          <p className="text-gray-400 text-sm">
            Tu as prouvé que tu pouvais être régulier — c&apos;est le plus dur. La suite ?
          </p>
          <div className="bg-d5-gold text-black rounded-xl px-4 py-3 text-sm font-bold text-center">
            Réserver mon appel découverte gratuit →
          </div>
        </div>
      )}
    </div>
  );
}
