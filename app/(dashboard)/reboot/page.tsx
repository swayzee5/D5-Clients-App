export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Zap, CheckCircle2, ArrowRight, MessageCircle, Lock } from "lucide-react";
import Link from "next/link";
import { getRebootSessions } from "@/lib/queries/reboot";
import { pool } from "@/lib/db";
import { SeancesSection } from "./SeancesSection";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reboot 40" };

const MUSCLE_CONFIG: Record<string, { label: string; desc: string; icon: string }> = {
  pecs:     { label: "Pectoraux",               desc: "Poitrine · Épaules · Triceps",        icon: "💪" },
  dos:      { label: "Dos & Biceps",             desc: "Grand dorsal · Trapèzes · Biceps",    icon: "🏋️" },
  epaules:  { label: "Épaules",                 desc: "Deltoïdes · Trapèzes · Rotateurs",    icon: "🔱" },
  bras:     { label: "Bras",                    desc: "Biceps · Triceps · Avant-bras",       icon: "💪" },
  jambes_h: { label: "Jambes Homme",             desc: "Quadriceps · Ischio · Fessiers",     icon: "🦵" },
  jambes_f: { label: "Jambes & Fessiers Femme", desc: "Fessiers · Quadriceps · Adducteurs", icon: "🦵" },
  fullbody: { label: "Full Body",               desc: "Corps entier · Force · Cardio",      icon: "⚡" },
  gainage:  { label: "Gainage",                 desc: "Core · Abdominaux · Stabilité",      icon: "🔥" },
  abdos:    { label: "Abdominaux",              desc: "Droits · Obliques · Transverse",     icon: "💠" },
  cardio:   { label: "Cardio & Mobilité",        desc: "Endurance · Flexibilité · Récup",    icon: "🏃" },
  jambes:   { label: "Jambes",                  desc: "Quadriceps · Ischio · Fessiers",     icon: "🦵" },
};

const MODULES = [
  { key: "regularite",  emoji: "🔥", title: "La régularité avant l'intensité", teaser: "Le secret de la transformation durable" },
  { key: "hydratation", emoji: "💧", title: "L'hydratation, ton moteur",        teaser: "2L minimum — comprendre pourquoi" },
  { key: "sommeil",     emoji: "😴", title: "Le sommeil, ton meilleur allié",   teaser: "Quand le vrai travail se fait" },
  { key: "nutrition",   emoji: "🥗", title: "Protéines à chaque repas",          teaser: "La règle simple qui change tout" },
];

const DEFAULT_WELCOME =
  "Vas-y à ton rythme. Ce qui compte, c'est de compléter chaque étape — pas de le faire vite. Tu as tout ce qu'il faut.";

const SEANCES_GOAL = 3;
const WA_GOAL = 3;
const MODULES_GOAL = 4;
const TOTAL_TASKS = SEANCES_GOAL + WA_GOAL + MODULES_GOAL;

export default async function RebootPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const clientId = session.user.id;

  let sessions: Awaited<ReturnType<typeof getRebootSessions>> = [];
  let completedModules: string[] = [];
  let waCompleted = 0;
  let welcomeMessage = DEFAULT_WELCOME;
  let completionDates: { first: string; last: string } | null = null;

  try { sessions = await getRebootSessions(clientId); } catch {}

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS reboot_task_completions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT NOT NULL,
      task_key TEXT NOT NULL, completed_at TIMESTAMPTZ DEFAULT now(), UNIQUE(client_id, task_key)
    )`);
    const { rows } = await pool.query(`SELECT task_key FROM reboot_task_completions WHERE client_id = $1`, [clientId]);
    completedModules = rows.map((r: { task_key: string }) => r.task_key);
  } catch {}

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS reboot_whatsapp_completions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT NOT NULL, session_id TEXT NOT NULL,
      sent_at TIMESTAMPTZ DEFAULT now(), UNIQUE(client_id, session_id)
    )`);
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM reboot_whatsapp_completions WHERE client_id = $1`,
      [clientId]
    );
    waCompleted = parseInt(rows[0]?.cnt ?? 0);
  } catch {}

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT now())`);
    const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'reboot_welcome_message'`);
    if (rows[0]?.value) welcomeMessage = rows[0].value;
  } catch {}

  const seenGroups = new Set<string>();
  const muscleGroupKeys: string[] = [];
  for (const s of sessions) {
    if (!seenGroups.has(s.muscle_group)) {
      seenGroups.add(s.muscle_group);
      muscleGroupKeys.push(s.muscle_group);
    }
  }

  const sessionsByMuscle: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    if (!sessionsByMuscle[s.muscle_group]) sessionsByMuscle[s.muscle_group] = [];
    sessionsByMuscle[s.muscle_group].push(s);
  }

  const sessionsTotal = muscleGroupKeys.length;
  const sessionsCompleted = sessions.filter((s) => s.completed).length;

  const seancesDoneForProgress = Math.min(sessionsCompleted, SEANCES_GOAL);
  const waDoneForProgress = Math.min(waCompleted, WA_GOAL);
  const modulesDoneForProgress = Math.min(completedModules.length, MODULES_GOAL);

  const totalCompleted = seancesDoneForProgress + waDoneForProgress + modulesDoneForProgress;
  const progressPct = Math.round((totalCompleted / TOTAL_TASKS) * 100);
  const allDone = totalCompleted === TOTAL_TASKS;

  if (allDone) {
    try {
      const [{ rows: sRows }, { rows: mRows }] = await Promise.all([
        pool.query(`SELECT MIN(completed_at) as first, MAX(completed_at) as last FROM reboot_completions WHERE client_id = $1::uuid`, [clientId]),
        pool.query(`SELECT MIN(completed_at) as first, MAX(completed_at) as last FROM reboot_task_completions WHERE client_id = $1`, [clientId]),
      ]);
      const allDates = [sRows[0]?.first, sRows[0]?.last, mRows[0]?.first, mRows[0]?.last]
        .filter(Boolean).map((d) => new Date(d as string).getTime());
      if (allDates.length > 0) {
        const fmt = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
        completionDates = { first: fmt(Math.min(...allDates)), last: fmt(Math.max(...allDates)) };
      }
    } catch {}
  }

  const waMessages = [
    { ordinal: 1, label: "Message 1/3 envoyé", done: waCompleted >= 1 },
    { ordinal: 2, label: "Message 2/3 envoyé", done: waCompleted >= 2 },
    { ordinal: 3, label: "Message 3/3 envoyé", done: waCompleted >= 3 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-d5-gold/20 to-transparent border border-d5-gold/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-d5-gold" />
          <span className="text-d5-gold text-xs font-semibold uppercase tracking-wider">Challenge offert</span>
        </div>
        <h1 className="text-xl font-bold text-white">Reboot 40</h1>
        <p className="text-gray-400 text-sm mt-0.5">{TOTAL_TASKS} étapes pour te remettre en mouvement</p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400">{totalCompleted}/{TOTAL_TASKS} étapes complétées</span>
            <span className="text-d5-gold font-semibold">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-d5-gold rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-d5-gold font-semibold uppercase tracking-wider mb-1">Mot de ton coach</p>
          <p className="text-gray-300 text-sm leading-relaxed">{welcomeMessage}</p>
        </div>
      </div>

      <SeancesSection
        muscleGroupKeys={muscleGroupKeys}
        sessionsByMuscle={sessionsByMuscle}
        muscleConfig={MUSCLE_CONFIG}
        sessionsCompleted={sessionsCompleted}
        sessionsTotal={sessionsTotal}
        seancesGoal={SEANCES_GOAL}
      />

      <section className="space-y-2">
        <div className="flex items-center justify-between py-1">
          <h2 className="text-white font-semibold text-sm">Messages WhatsApp</h2>
          <span className="text-xs text-d5-muted">{waDoneForProgress}/{WA_GOAL} envoyés</span>
        </div>
        {waMessages.map(({ ordinal, label, done }) => {
          const locked = sessionsCompleted < ordinal;
          return (
            <div key={ordinal} className={`card flex items-center gap-3 transition-all ${
              done ? "border-green-500/20 bg-green-500/5" : locked ? "opacity-50" : "border-d5-gold/20"
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                done ? "bg-green-500/10" : "bg-d5-surface-2"
              }`}>
                {done
                  ? <CheckCircle2 size={18} className="text-green-400" />
                  : locked
                    ? <Lock size={16} className="text-d5-muted" />
                    : <MessageCircle size={18} className="text-d5-gold" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${done ? "text-gray-400" : locked ? "text-gray-500" : "text-white"}`}>
                  {label}
                </p>
                <p className="text-d5-muted text-xs">
                  {done ? "Envoyé ✓" : locked ? `Complète la séance ${ordinal} d'abord` : "Envoyé après ta séance"}
                </p>
              </div>
              {done && <span className="text-xs text-green-400 font-medium shrink-0">✓</span>}
            </div>
          );
        })}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between py-1">
          <h2 className="text-white font-semibold text-sm">Modules lifestyle</h2>
          <span className="text-xs text-d5-muted">{modulesDoneForProgress}/{MODULES_GOAL} validés</span>
        </div>
        {MODULES.map(({ key, emoji, title, teaser }) => {
          const done = completedModules.includes(key);
          return (
            <Link key={key} href={`/reboot/module/${key}`}>
              <div className={`card flex items-center gap-3 transition-all active:scale-[0.98] ${
                done ? "border-green-500/20 bg-green-500/5" : "hover:border-d5-gold/30"
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  done ? "bg-green-500/10" : "bg-d5-surface-2"
                }`}>
                  {done ? <CheckCircle2 size={18} className="text-green-400" /> : <span className="text-xl">{emoji}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${done ? "text-gray-400" : "text-white"}`}>{title}</p>
                  <p className="text-d5-muted text-xs">{done ? "Validé" : teaser}</p>
                </div>
                {done
                  ? <span className="text-xs text-green-400 font-medium shrink-0">✓</span>
                  : <ArrowRight size={15} className="text-d5-muted shrink-0" />}
              </div>
            </Link>
          );
        })}
      </section>

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
              <div className="flex items-center gap-2">
                <span className="text-base">🏋️</span>
                <span className="text-gray-300 text-sm flex-1">3 séances complétées</span>
                <CheckCircle2 size={13} className="text-green-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <span className="text-gray-300 text-sm flex-1">3 messages WhatsApp envoyés</span>
                <CheckCircle2 size={13} className="text-green-400" />
              </div>
              {MODULES.map((m) => (
                <div key={m.key} className="flex items-center gap-2">
                  <span className="text-base">{m.emoji}</span>
                  <span className="text-gray-300 text-sm flex-1">{m.title}</span>
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
