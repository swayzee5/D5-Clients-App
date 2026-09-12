import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { countSeanceCompletions, getRebootSessionWithExercises, isSessionCompleted } from "@/lib/queries/reboot";
import { RebootSeanceGrid } from "./RebootSeanceGrid";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Séance Reboot" };

/**
 * Le bandeau vient de l'onglet, pas du lieu. Un échauffement était étiqueté
 * « Salle » ou « Maison » selon une colonne qui n'a pas de sens pour lui.
 */
const BADGES: Record<string, { label: string; className: string }> = {
  salle:    { label: "Salle",       className: "bg-blue-500/15 text-blue-400" },
  maison:   { label: "Maison",      className: "bg-green-500/15 text-green-400" },
  mobilite: { label: "Mobilité",    className: "bg-sky-500/15 text-sky-300" },
  hiit:     { label: "HIIT",        className: "bg-orange-500/15 text-orange-400" },
};

export default async function RebootSessionPage({ params }: { params: { sessionId: string } }) {
  const session = await auth();
  if (!session) redirect("/login");
  const clientId = session.user.id;

  let data: Awaited<ReturnType<typeof getRebootSessionWithExercises>> = null;
  let completed = false;
  let completionsBefore = 0;

  try {
    const [dataResult, completedResult, seancesDone] = await Promise.all([
      getRebootSessionWithExercises(params.sessionId),
      isSessionCompleted(clientId, params.sessionId),
      countSeanceCompletions(clientId).catch(() => 0),
    ]);
    data = dataResult;
    completed = completedResult;
    completionsBefore = seancesDone;
    if (completed && !dataResult?.session.is_bonus) {
      completionsBefore = Math.max(0, completionsBefore - 1);
    }
  } catch { return notFound(); }

  if (!data) return notFound();
  const { session: rebootSession, exercises } = data;
  const badge = BADGES[rebootSession.tab] ?? BADGES.salle;

  return (
    <div className="space-y-5 pb-8">
      <Link href="/reboot" className="inline-flex items-center gap-1.5 text-d5-muted text-sm hover:text-white transition-colors">
        <ArrowLeft size={14} />Retour au challenge
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <h1 className="text-xl font-bold text-white">{rebootSession.name}</h1>
        {rebootSession.description && <p className="text-d5-muted text-sm mt-1">{rebootSession.description}</p>}
        <div className="flex items-center gap-3 mt-2 text-xs text-d5-muted">
          {!rebootSession.is_bonus && <span>{exercises.length} exercices</span>}
          {rebootSession.duration_minutes && <span>⏱ {rebootSession.duration_minutes} min</span>}
        </div>
      </div>

      {exercises.length === 0 ? (
        <div className="card text-center py-6">
          <p className="text-d5-muted text-sm">Les exercices arrivent bientôt…</p>
        </div>
      ) : (
        <RebootSeanceGrid
          exercises={exercises}
          clientId={clientId}
          sessionId={params.sessionId}
          sessionName={rebootSession.name}
          alreadyCompleted={completed}
          completionsBefore={completionsBefore}
          isBonus={rebootSession.is_bonus}
        />
      )}
    </div>
  );
}
