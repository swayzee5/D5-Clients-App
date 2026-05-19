export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Zap, CheckCircle2, Dumbbell, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getRebootSessions } from "@/lib/queries/reboot";
import { pool } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reboot 40" };

const MUSCLE_GROUPS = [
  { key: "pecs",   label: "Pectoraux",    desc: "Poitrine · Épaules avant · Triceps",      icon: "💪" },
  { key: "dos",    label: "Dos & Biceps", desc: "Grand dorsal · Trapèzes · Biceps",         icon: "🏋️" },
  { key: "jambes", label: "Jambes",       desc: "Quadriceps · Ischio-jambiers · Fessiers", icon: "🦵" },
];

const MODULES = [
  { key: "regularite",  emoji: "🔥", title: "La régularité avant l'intensité", teaser: "Le secret de la transformation durable" },
  { key: "hydratation", emoji: "💧", title: "L'hydratation, ton moteur",        teaser: "2L minimum — comprendre pourquoi" },
  { key: "sommeil",     emoji: "😴", title: "Le sommeil, ton meilleur allié",   teaser: "Quand le vrai travail se fait" },
  { key: "nutrition",   emoji: "🥗", title: "Protéines à chaque repas",          teaser: "La règle simple qui change tout" },
];

const ACCOMPLISHMENTS = [
  { icon: "💪", text: "Séance Pectoraux" },
  { icon: "🏋️", text: "Séance Dos & Biceps" },
  { icon: "🦵", text: "Séance Jambes" },
  { icon: "🔥", text: "Module Régularité" },
  { icon: "💧", text: "Module Hydratation" },
  { icon: "😴", text: "Module Sommeil" },
  { icon: "🥗", text: "Module Nutrition" },
];

const DEFAULT_WELCOME =
  "Vas-y à ton rythme. Ce qui compte, c'est de compléter chaque étape — pas de le faire vite. Tu as tout ce qu'il faut.";

export default async function RebootPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const clientId = session.user.id;

  let sessions: Awaited<ReturnType<typeof getRebootSessions>> = [];
  let completedModules: string[] = [];
  let welcomeMessage = DEFAULT_WELCOME;
  let completionDates: { first: string; last: string } | null = null;

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

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    const { rows } = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'reboot_welcome_message'`
    );
    if (rows[0]?.value) welcomeMessage = rows[0].value;
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

  if (allDone) {
    try {
      const [{ rows: sRows }, { rows: mRows }] = await Promise.all([
        pool.query(
          `SELECT MIN(completed_at) as first, MAX(completed_at) as last FROM reboot_completions WHERE client_id = $1::uuid`,
          [clientId]
        ),
        pool.query(
          `SELECT MIN(completed_at) as first, MAX(completed_at) as last FROM reboot_task_completions WHERE client_id = $1`,
          [clientId]
        ),
      ]);
      const allDates = [sRows[0]?.first, sRows[0]?.last, mRows[0]?.first, mRows[0]?.last]
        .filter(Boolean)
        .map((d) => new Date(d as string).getTime());
      if (allDates.length > 0) {
        const fmt = (ms: number) =>
          new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
        completionDates = { first: fmt(Math.min(...allDates)), last: fmt(Math.max(...allDates)) };
      }
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-d5-gold/20 to-transparent border border-d5-gold/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-d5-gold" />
          <span className="text-d5-gold text-xs font-semibold uppercase tracking-wider">Challenge offert</span>
        </div>
        <h1 className="text-xl font-bold text-white">Reboot 40</h1>
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
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-d5-gold font-semibold uppercase tracking-wider mb-1">Mot de ton coach</p>
          <p className="text-gray-300 text-sm leading-relaxed">{welcomeMessage}</p>
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
            <div key={key} className={`card transition-all ${done ? "border-green-500/20 bg-green-500/5" : "border-d5-border"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-green-500/10" : "bg-d5-surface-2"}`}>
                  {done ? <CheckCircle2 size={18} className="text-green-400" /> : <span className="text-lg">{icon}</span>}
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
                          s.location === "salle" ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"
                        }`}>{s.location === "salle" ? "Salle" : "Maison"}</span>
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
                done ? "border-green-500/20 bg-green-500/5" : "hover:border-d5-gold/30"
              }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-green-500/10" : "bg-d5-surface-2"}`}>
                  {done ? <CheckCircle2 size={18} className="text-green-400" /> : <span className="text-lg">{emoji}</span>}
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

      {/* Bilan final */}
      {allDone && (
        <div className="space-y-4 pb-4">
          <div className="bg-gradient-to-br from-d5-gold/30 via-d5-gold/10 to-transparent border-2 border-d5-gold/50 rounded-2xl p-6 text-center space-y-2">
            <div className="text-5xl">🏆</div>
            <h2 className="text-white text-xl font-bold">Challenge complété !</h2>
            {completionDates && (
              <p className="text-d5-muted text-sm">Du {completionDates.first} au {completionDates.last}</p>
            )}
          </div>

          <div className="card space-y-3">
            <p className="text-d5-gold text-xs font-bold uppercase tracking-wider">Ce que tu as accompli</p>
            <div className="space-y-2">
              {ACCOMPLISHMENTS.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-gray-300 text-sm flex-1">{item.text}</span>
                  <CheckCircle2 size={13} className="text-green-400" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-gray-400 text-sm text-center leading-relaxed">
              Tu as prouvé que tu peux être régulier. L&apos;accompagnement coaching va 10× plus loin — programme personnalisé, suivi nutritionnel, et coaching direct.
            </p>
            <div className="bg-d5-gold text-black rounded-xl px-4 py-4 text-sm font-bold text-center cursor-pointer hover:bg-d5-gold/90 transition-colors active:scale-[0.98]">
              Réserver mon appel découverte gratuit →
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
