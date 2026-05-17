export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Zap, CheckCircle2, Dumbbell, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getRebootSessions } from "@/lib/queries/reboot";
import { pool } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reboot 40" };

const MUSCLE_FOR_DAY: Record<number, string> = { 1: "pecs", 3: "dos", 5: "jambes" };

const REST_TIPS: Record<number, string[]> = {
  2: [
    "Marche 30 à 45 min à rythme modéré",
    "Étirements statiques 10–15 min",
    "Boire au moins 2L d’eau",
    "Coucher tôt pour maximaliser la récupération",
  ],
  4: [
    "Repos complet ou marche légère",
    "Remplis ton check-in mi-challenge ci-dessous",
    "Note tes progrès depuis le J1",
  ],
};

const DAY_PLAN = [
  { day: 1, type: "session", label: "Pectoraux",      icon: "💪", desc: "Poitrine, épaules avant, triceps" },
  { day: 2, type: "rest",    label: "Repos actif",    icon: "🚶", desc: "Marche · Étirements · Hydratation" },
  { day: 3, type: "session", label: "Dos & Biceps",   icon: "🏋️", desc: "Grand dorsal, trapèzes, biceps" },
  { day: 4, type: "checkin", label: "Check-in + Repos", icon: "📊", desc: "Mi-parcours — fais le point sur tes ressentis" },
  { day: 5, type: "session", label: "Jambes & Fessiers", icon: "🦵", desc: "Quadriceps, ischio-jambiers, fessiers, mollets" },
  { day: 6, type: "bonus",   label: "Séance bonus",    icon: "⚡", desc: "Retravaille ton groupe musculaire le plus faible" },
  { day: 7, type: "finish",  label: "Bilan final",    icon: "🏆", desc: "Challenge terminé — et maintenant ?" },
];

const TIPS = [
  { emoji: "🔥", title: "La régularité avant l’intensité", body: "3 séances bien faites valent mieux que 5 bâclées." },
  { emoji: "💧", title: "Hydratation", body: "2L minimum par jour. Ton corps récupère mieux." },
  { emoji: "😴", title: "Le sommeil, ton meilleur allié", body: "7–8h accélèrent ta progression." },
  { emoji: "🥗", title: "Protéines à chaque repas", body: "1.6g/kg de poids de corps. Ça préserve le muscle." },
];

export default async function RebootPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const clientId = session.user.id;

  let sessions: Awaited<ReturnType<typeof getRebootSessions>> = [];
  let midCheckinDone = false;

  try { sessions = await getRebootSessions(clientId); } catch {}

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reboot_mid_checkins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id TEXT NOT NULL UNIQUE,
        weight DECIMAL(5,2),
        energy INT,
        sleep_quality INT,
        feeling TEXT,
        is_read BOOLEAN DEFAULT false,
        submitted_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    const { rows } = await pool.query(
      `SELECT EXISTS(SELECT 1 FROM reboot_mid_checkins WHERE client_id = $1) AS exists`,
      [clientId]
    );
    midCheckinDone = rows[0]?.exists ?? false;
  } catch {}

  const pecsCompleted   = sessions.some((s) => s.muscle_group === "pecs"   && s.completed);
  const dosCompleted    = sessions.some((s) => s.muscle_group === "dos"    && s.completed);
  const jambesCompleted = sessions.some((s) => s.muscle_group === "jambes" && s.completed);
  const completedCount  = sessions.filter((s) => s.completed).length;
  const bonusCompleted  = completedCount >= 4;
  const allDone         = pecsCompleted && dosCompleted && jambesCompleted;
  const progressPct     = Math.min(Math.round((completedCount / 3) * 100), 100);

  const isDayDone = (day: number): boolean => {
    if (day === 1) return pecsCompleted;
    if (day === 2) return pecsCompleted;
    if (day === 3) return dosCompleted;
    if (day === 4) return dosCompleted;
    if (day === 5) return jambesCompleted;
    if (day === 6) return bonusCompleted;
    if (day === 7) return allDone;
    return false;
  };

  const activeDay = DAY_PLAN.find((d) => !isDayDone(d.day))?.day ?? 7;

  const sessionsByMuscle: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    if (!sessionsByMuscle[s.muscle_group]) sessionsByMuscle[s.muscle_group] = [];
    sessionsByMuscle[s.muscle_group].push(s);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-d5-gold/20 to-transparent border border-d5-gold/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-d5-gold" />
          <span className="text-d5-gold text-xs font-semibold uppercase tracking-wider">Challenge offert</span>
        </div>
        <h1 className="text-xl font-bold text-white">Reboot 40</h1>
        <p className="text-gray-400 text-sm mt-0.5">7 jours pour te remettre en mouvement</p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400">{Math.min(completedCount, 3)}/3 séances principales</span>
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

      {/* 7-day plan */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold text-sm">Plan 7 jours</h2>

        {DAY_PLAN.map(({ day, type, label, icon, desc }) => {
          const done   = isDayDone(day);
          const active = day === activeDay;
          const locked = !done && !active;

          return (
            <div
              key={day}
              className={`card transition-all ${
                done   ? "opacity-50 border-white/5" :
                active ? "border-d5-gold/40 bg-d5-gold/5" :
                         "opacity-30"
              }`}
            >
              {/* Header row */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  done ? "bg-green-500/10" : active ? "bg-d5-gold/15" : "bg-white/5"
                }`}>
                  {done   ? <CheckCircle2 size={16} className="text-green-400" /> :
                   locked ? <Lock size={13} className="text-gray-600" /> :
                            <span className="text-base">{icon}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-d5-muted font-mono">J{day}</span>
                    <p className={`font-semibold text-sm ${
                      done ? "text-gray-400" : active ? "text-white" : "text-gray-500"
                    }`}>{label}</p>
                    {active && !done && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-d5-gold/20 text-d5-gold font-medium">
                        Aujourd’hui
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-d5-muted mt-0.5">{desc}</p>
                </div>
              </div>

              {/* Content */}
              {!locked && (
                <div className="mt-3">

                  {/* Session day */}
                  {type === "session" && MUSCLE_FOR_DAY[day] && (
                    <div className="grid grid-cols-2 gap-2">
                      {(sessionsByMuscle[MUSCLE_FOR_DAY[day]] ?? []).map((s) => (
                        <Link key={s.id} href={`/reboot/${s.id}`}>
                          <div className={`rounded-xl p-3 border transition-all ${
                            s.completed
                              ? "bg-d5-gold/10 border-d5-gold/20"
                              : "bg-d5-surface-2 border-d5-border hover:border-white/20"
                          }`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                                s.location === "salle"
                                  ? "bg-blue-500/15 text-blue-400"
                                  : "bg-green-500/15 text-green-400"
                              }`}>
                                {s.location === "salle" ? "Salle" : "Maison"}
                              </span>
                              {s.completed && <CheckCircle2 size={13} className="text-d5-gold" />}
                            </div>
                            <p className={`text-xs font-medium leading-snug ${
                              s.completed ? "text-d5-gold" : "text-white"
                            }`}>{s.name}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Dumbbell size={10} className="text-d5-muted" />
                              <span className="text-d5-muted text-xs">{s.exercise_count} ex.</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Rest / checkin tips */}
                  {(type === "rest" || type === "checkin") && REST_TIPS[day] && (
                    <ul className="space-y-1.5 mb-3">
                      {REST_TIPS[day].map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-d5-muted">
                          <span className="text-d5-gold mt-0.5">·</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Check-in CTA */}
                  {type === "checkin" && (
                    midCheckinDone ? (
                      <div className="flex items-center gap-2 bg-green-500/10 rounded-xl px-3 py-2.5">
                        <CheckCircle2 size={14} className="text-green-400" />
                        <p className="text-green-400 text-sm font-medium">Check-in envoyé ✓</p>
                      </div>
                    ) : (
                      <Link href="/reboot/checkin">
                        <div className="flex items-center justify-between bg-d5-gold/10 border border-d5-gold/20 rounded-xl px-4 py-3 hover:bg-d5-gold/15 transition-colors">
                          <div>
                            <p className="text-white text-sm font-medium">Remplir mon check-in</p>
                            <p className="text-d5-muted text-xs mt-0.5">Énergie · Sommeil · Poids · Ressenti</p>
                          </div>
                          <ArrowRight size={16} className="text-d5-gold" />
                        </div>
                      </Link>
                    )
                  )}

                  {/* Bonus day */}
                  {type === "bonus" && (
                    <div className="space-y-2">
                      <p className="text-xs text-d5-muted">Choisis le groupe à retravailler :</p>
                      {sessions.filter((s) => !s.completed).slice(0, 4).map((s) => (
                        <Link key={s.id} href={`/reboot/${s.id}`}>
                          <div className="flex items-center gap-3 bg-d5-surface-2 border border-d5-border hover:border-white/20 rounded-xl p-3 transition-all">
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{s.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  s.location === "salle" ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"
                                }`}>
                                  {s.location === "salle" ? "Salle" : "Maison"}
                                </span>
                                <span className="text-d5-muted text-xs">{s.exercise_count} ex.</span>
                              </div>
                            </div>
                            <ArrowRight size={14} className="text-d5-muted" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Finish day */}
                  {type === "finish" && allDone && (
                    <div className="space-y-3">
                      <p className="text-white text-sm leading-relaxed">
                        Félicitations 🎉 Tu as complété les 3 séances du Reboot 40. Tu as prouvé que tu pouvais être régulier — c’est le plus dur.
                      </p>
                      <div className="bg-d5-gold text-black rounded-xl px-4 py-3 text-sm font-bold text-center">
                        Réserver mon appel découverte gratuit →
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Conseils D5 */}
      <div className="space-y-3">
        <h2 className="text-white font-semibold text-sm">Conseils D5</h2>
        {TIPS.map((tip, i) => (
          <div key={i} className="card flex gap-3">
            <span className="text-lg shrink-0">{tip.emoji}</span>
            <div>
              <p className="text-white text-sm font-medium">{tip.title}</p>
              <p className="text-d5-muted text-xs mt-0.5">{tip.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
