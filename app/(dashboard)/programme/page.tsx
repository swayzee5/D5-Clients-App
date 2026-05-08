import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActiveProgram } from "@/lib/queries/programme";
import { Dumbbell } from "lucide-react";
import type { Metadata } from "next";
import CommentForm from "./CommentForm";

export const metadata: Metadata = {
  title: "Programme",
};

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

      {/* Programme header card */}
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
            Début :{" "}
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
        </div>
      </div>

      {/* Sessions */}
      <div className="space-y-4">
        {activeProgram.sessions.map((sess, i) => (
          <div key={sess.id} className="card">
            {/* Session header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-d5-gold/10 flex items-center justify-center shrink-0">
                <span className="text-d5-gold font-bold text-sm">{i + 1}</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">{sess.name}</h3>
                {sess.day_of_week !== null && (
                  <p className="text-d5-muted text-xs">{DAY_NAMES[sess.day_of_week]}</p>
                )}
              </div>
            </div>

            {/* Exercises */}
            {sess.exercises.length === 0 ? (
              <p className="text-d5-muted text-sm text-center py-3">
                Aucun exercice
              </p>
            ) : (
              <div>
                <div className="grid grid-cols-12 gap-2 pb-2 border-b border-d5-border">
                  <div className="col-span-6 text-xs text-d5-muted uppercase tracking-wider">
                    Exercice
                  </div>
                  <div className="col-span-2 text-xs text-d5-muted text-center uppercase tracking-wider">
                    Séries
                  </div>
                  <div className="col-span-2 text-xs text-d5-muted text-center uppercase tracking-wider">
                    Reps
                  </div>
                  <div className="col-span-2 text-xs text-d5-muted text-center uppercase tracking-wider">
                    Repos
                  </div>
                </div>

                <div className="divide-y divide-d5-border">
                  {sess.exercises.map((ex) => (
                    <div key={ex.id} className="grid grid-cols-12 gap-2 py-3 items-center">
                      <div className="col-span-6">
                        <p className="text-white text-sm font-medium">{ex.name}</p>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-d5-gold font-bold">
                          {ex.sets ?? "—"}
                        </span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-white text-sm">{ex.reps ?? "—"}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-d5-muted text-sm">
                          {ex.rest_seconds != null ? `${ex.rest_seconds}s` : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comment form */}
      <CommentForm clientId={session.user.id} programId={activeProgram.id} />
    </div>
  );
}
