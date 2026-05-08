import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Zap, CheckCircle2, Dumbbell } from "lucide-react";
import Link from "next/link";
import { getRebootSessions } from "@/lib/queries/reboot";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reboot 40" };

const MUSCLE_LABELS: Record<string, string> = {
  pecs: "Pectoraux",
  dos: "Dos & Biceps",
  jambes: "Jambes & Fessiers",
};

const MUSCLE_ICONS: Record<string, string> = {
  pecs: "💪",
  dos: "🏋️",
  jambes: "🦵",
};

const TIPS = [
  {
    emoji: "🔥",
    title: "La régularité avant l’intensité",
    body: "3 séances bien faites valent mieux que 5 séances bâclées. Avance à ton rythme.",
  },
  {
    emoji: "💧",
    title: "Hydratation",
    body: "2L d’eau minimum par jour. Ton corps a besoin de carburant pour récupérer.",
  },
  {
    emoji: "😴",
    title: "Le sommeil, ton meilleur allié",
    body: "7–8h de sommeil accélèrent ta progression. La récupération se fait la nuit.",
  },
  {
    emoji: "🥗",
    title: "Protéines à chaque repas",
    body: "Vise 1.6g de protéines par kg de poids de corps. Ça préserve le muscle.",
  },
];

export default async function RebootPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const clientId = session.user.id;
  let sessions: Awaited<ReturnType<typeof getRebootSessions>> = [];
  let dbError = false;

  try {
    sessions = await getRebootSessions(clientId);
  } catch {
    dbError = true;
  }

  const completedCount = sessions.filter((s) => s.completed).length;
  const totalSessions = sessions.length || 6;
  const progressPct = Math.round((completedCount / totalSessions) * 100);

  const groups: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    if (!groups[s.muscle_group]) groups[s.muscle_group] = [];
    groups[s.muscle_group].push(s);
  }

  const muscleOrder = ["pecs", "dos", "jambes"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-d5-gold/20 to-transparent border border-d5-gold/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-d5-gold" />
          <span className="text-d5-gold text-xs font-semibold uppercase tracking-wider">
            Challenge offert
          </span>
        </div>
        <h1 className="text-xl font-bold text-white">Reboot 40</h1>
        <p className="text-gray-400 text-sm mt-1">
          3 groupes musculaires. Salle ou maison. Toi qui choisis.
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400">
              {completedCount}/{totalSessions} séances complétées
            </span>
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
      <div className="space-y-5">
        <h2 className="text-white font-semibold text-sm">Tes séances</h2>

        {dbError && (
          <div className="card opacity-60 text-center py-6">
            <p className="text-d5-muted text-sm">Les séances arrivent bientôt…</p>
          </div>
        )}

        {muscleOrder.map((muscle) => {
          const list = groups[muscle];
          if (!list?.length) return null;
          return (
            <div key={muscle}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">{MUSCLE_ICONS[muscle]}</span>
                <h3 className="text-white font-medium text-sm">
                  {MUSCLE_LABELS[muscle]}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {list.map((s) => (
                  <Link key={s.id} href={`/reboot/${s.id}`}>
                    <div
                      className={`card h-full transition-all ${
                        s.completed
                          ? "border-d5-gold/30 bg-d5-gold/5"
                          : "hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span
                          className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                            s.location === "salle"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-green-500/15 text-green-400"
                          }`}
                        >
                          {s.location === "salle" ? "Salle" : "Maison"}
                        </span>
                        {s.completed && (
                          <CheckCircle2 size={15} className="text-d5-gold shrink-0" />
                        )}
                      </div>
                      <p
                        className={`text-sm font-medium leading-snug ${
                          s.completed ? "text-d5-gold" : "text-white"
                        }`}
                      >
                        {s.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Dumbbell size={11} className="text-d5-muted" />
                        <span className="text-d5-muted text-xs">
                          {s.exercise_count} exercices
                        </span>
                      </div>
                      {s.duration_minutes && (
                        <p className="text-d5-muted text-xs mt-0.5">
                          ⏱ {s.duration_minutes} min
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
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

      {/* Upsell CTA */}
      <div className="card border-d5-gold/20 bg-gradient-to-br from-d5-gold/5 to-transparent">
        <p className="text-xs text-d5-gold font-semibold uppercase tracking-wider mb-2">
          Après le challenge
        </p>
        <p className="text-white font-semibold text-sm">Prêt pour la suite ?</p>
        <p className="text-d5-muted text-xs mt-1">
          Le coaching individuel D5 va plus loin : programme personnalisé,
          nutrition sur-mesure, suivi hebdomadaire.
        </p>
      </div>
    </div>
  );
}
