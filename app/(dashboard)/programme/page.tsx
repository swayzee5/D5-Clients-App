import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActiveProgram } from "@/lib/queries/programme";
import { Dumbbell, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import CommentForm from "./CommentForm";

export const metadata: Metadata = { title: "Programme" };
export const dynamic = "force-dynamic";

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default async function ProgrammePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const activeProgram = await getActiveProgram(session.user.id);

  if (!activeProgram || activeProgram.sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Programme</h1>
          <p className="text-d5-muted text-sm mt-1">Tes séances d&apos;entraînement</p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-400/10 flex items-center justify-center mb-4">
            <Dumbbell size={28} className="text-blue-400" />
          </div>
          <p className="text-white font-semibold">Programme en cours de configuration</p>
          <p className="text-d5-muted text-sm mt-1">
            Ton coach va bientôt te créer un programme personnalisé
          </p>
        </div>
        <CommentForm clientId={session.user.id} programId={null} />
      </div>
    );
  }

  // Group sessions by week
  const weekGroups = new Map<number | null, typeof activeProgram.sessions>();
  for (const s of activeProgram.sessions) {
    const key = s.week_number ?? null;
    if (!weekGroups.has(key)) weekGroups.set(key, []);
    weekGroups.get(key)!.push(s);
  }
  const sortedWeeks = Array.from(weekGroups.keys()).sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });

  const totalExercises = activeProgram.sessions.reduce(
    (acc, s) => acc + s.exercises.length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Programme</h1>
        <p className="text-d5-muted text-sm mt-1">Tes séances d&apos;entraînement</p>
      </div>

      {/* Programme header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-white text-lg">{activeProgram.name}</h2>
            {activeProgram.description && (
              <p className="text-d5-muted text-sm mt-1">{activeProgram.description}</p>
            )}
          </div>
          {activeProgram.weeks_duration && (
            <div className="text-right shrink-0 ml-4">
              <p className="text-d5-gold font-bold text-lg">{activeProgram.weeks_duration}</p>
              <p className="text-d5-muted text-xs">semaines</p>
            </div>
          )}
        </div>
        {activeProgram.start_date && (
          <p className="text-d5-muted text-xs mt-2">
            Début :{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(activeProgram.start_date))}
          </p>
        )}
        <div className="flex gap-6 mt-4 pt-4 border-t border-d5-border">
          <div>
            <p className="text-2xl font-black text-white">{activeProgram.sessions.length}</p>
            <p className="text-d5-muted text-xs mt-0.5">
              Séance{activeProgram.sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{totalExercises}</p>
            <p className="text-d5-muted text-xs mt-0.5">Exercices</p>
          </div>
          {sortedWeeks.filter((w) => w !== null).length > 0 && (
            <div>
              <p className="text-2xl font-black text-white">
                {sortedWeeks.filter((w) => w !== null).length}
              </p>
              <p className="text-d5-muted text-xs mt-0.5">Semaines</p>
            </div>
          )}
        </div>
      </div>

      {/* Sessions grouped by week */}
      <div className="space-y-6">
        {sortedWeeks.map((weekNum) => {
          const sessions = weekGroups.get(weekNum)!;
          const weekLabel = weekNum === null ? "Séances" : `Semaine ${weekNum}`;
          return (
            <div key={weekNum ?? "none"} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-d5-muted px-1">
                {weekLabel}
              </h3>
              {sessions.map((sess) => (
                <Link
                  key={sess.id}
                  href={`/programme/${activeProgram.id}/seance/${sess.id}`}
                  className="card block hover:border-d5-gold/30 transition-colors active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-d5-gold/10 flex items-center justify-center shrink-0">
                      <Dumbbell size={18} className="text-d5-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">{sess.name}</p>
                      <p className="text-d5-muted text-xs mt-0.5">
                        {sess.exercises.length} exercice{sess.exercises.length !== 1 ? "s" : ""}
                        {sess.day_of_week !== null ? ` · ${DAY_NAMES[sess.day_of_week]}` : ""}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-d5-muted shrink-0" />
                  </div>

                  {sess.exercises.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-d5-border space-y-2">
                      {sess.exercises.slice(0, 3).map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between">
                          <p className="text-d5-muted text-xs truncate flex-1 mr-2">{ex.name}</p>
                          <div className="flex gap-3 shrink-0">
                            {ex.sets && (
                              <span className="text-xs text-white">
                                <span className="text-d5-gold font-bold">{ex.sets}</span> sér.
                              </span>
                            )}
                            {ex.reps && (
                              <span className="text-xs text-white">{ex.reps} reps</span>
                            )}
                            {ex.rest_seconds && (
                              <span className="text-xs text-d5-muted">{ex.rest_seconds}s</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {sess.exercises.length > 3 && (
                        <p className="text-d5-muted text-xs">
                          +{sess.exercises.length - 3} autre{sess.exercises.length - 3 > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          );
        })}
      </div>

      <CommentForm clientId={session.user.id} programId={activeProgram.id} />
    </div>
  );
}
