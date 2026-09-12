"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Dumbbell, Clock, ChevronRight, PlayCircle } from "lucide-react";
import type { RebootSession } from "@/lib/queries/reboot";
import { TABS, type RebootTab } from "@/lib/reboot-catalogue";

/**
 * Les séances, réparties en quatre onglets.
 *
 * Avant, tout était dans une seule liste replié·e par défaut, mélangeant la
 * salle et la maison, et les libellés distinguaient une séance jambes « homme »
 * d'une séance jambes « femme ». Les séances sont maintenant les mêmes pour
 * tout le monde ; seul le lieu les sépare.
 *
 * L'onglet ouvert au départ est le premier qui contient quelque chose : afficher
 * « En salle » vide alors que « À la maison » est garni donnerait l'impression
 * qu'il n'y a rien.
 */

const ICONS: Record<string, string> = {
  pecs: "💪", dos: "🏋️", epaules: "🔱", bras: "💪",
  jambes: "🦵", haut: "🧍", fullbody: "⚡", gainage: "🔥", cardio: "🏃",
};

function SessionCard({ session, isVideo }: { session: RebootSession; isVideo: boolean }) {
  const done = session.completed;

  return (
    <Link href={`/reboot/${session.id}`}>
      <div className={`card flex items-center gap-3 transition-all active:scale-[0.98] ${
        done ? "border-green-500/20 bg-green-500/5" : "hover:border-d5-gold/30"
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          done ? "bg-green-500/10" : "bg-d5-surface-2"
        }`}>
          {done ? (
            <CheckCircle2 size={18} className="text-green-400" />
          ) : isVideo ? (
            <PlayCircle size={18} className="text-d5-gold" />
          ) : (
            <span className="text-xl">{ICONS[session.muscle_group] ?? "🏋️"}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate ${done ? "text-gray-400" : "text-white"}`}>
            {session.name}
          </p>
          <div className="flex items-center gap-3 text-xs text-d5-muted">
            {!isVideo && (
              <span className="flex items-center gap-1">
                <Dumbbell size={10} />{session.exercise_count} exercices
              </span>
            )}
            {session.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock size={10} />{session.duration_minutes} min
              </span>
            )}
          </div>
        </div>

        {done
          ? <span className="text-xs text-green-400 font-medium shrink-0">Faite ✓</span>
          : <ChevronRight size={15} className="text-d5-muted shrink-0" />}
      </div>
    </Link>
  );
}

export function SeancesSection({
  sessionsByTab,
  sessionsCompleted,
  seancesGoal,
}: {
  sessionsByTab: Record<RebootTab, RebootSession[]>;
  sessionsCompleted: number;
  seancesGoal: number;
}) {
  const firstFilled = TABS.find((t) => (sessionsByTab[t.key] ?? []).length > 0);
  const [active, setActive] = useState<RebootTab>(firstFilled?.key ?? "salle");

  const shown = sessionsByTab[active] ?? [];
  const activeTab = TABS.find((t) => t.key === active);
  const isVideoTab = active === "mobilite" || active === "hiit";
  const completedDisplay = Math.min(sessionsCompleted, seancesGoal);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between py-1">
        <h2 className="text-white font-semibold text-sm">Mes séances</h2>
        <span className="text-xs text-d5-muted">{completedDisplay}/{seancesGoal} complétées</span>
      </div>

      {/* Barre d'onglets. Défilement horizontal plutôt que retour à la ligne :
          quatre libellés ne tiennent pas sur la largeur d'un téléphone, et un
          demi-onglet visible sur le bord indique qu'il y a autre chose à côté. */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const count = (sessionsByTab[tab.key] ?? []).length;
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              disabled={count === 0}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                selected
                  ? "border-d5-gold bg-d5-gold/15 text-d5-gold"
                  : count === 0
                    ? "border-d5-border bg-d5-surface-2 text-gray-600"
                    : "border-d5-border bg-d5-surface-2 text-d5-muted hover:text-white"
              }`}
            >
              {tab.label}
              {count > 0 && <span className="ml-1.5 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {activeTab && (
        <p className="text-xs text-d5-muted">
          {isVideoTab
            ? `${activeTab.hint} · ces vidéos ne comptent pas dans tes ${seancesGoal} séances`
            : `${activeTab.hint} · choisis celles qui te vont`}
        </p>
      )}

      <div className="space-y-2">
        {shown.length === 0 ? (
          <div className="card py-5 text-center">
            <p className="text-d5-muted text-sm">Rien dans cet onglet pour le moment.</p>
          </div>
        ) : (
          shown.map((s) => <SessionCard key={s.id} session={s} isVideo={isVideoTab} />)
        )}
      </div>
    </section>
  );
}
