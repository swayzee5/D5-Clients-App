import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getRebootSessionWithExercises, isSessionCompleted } from "@/lib/queries/reboot";
import { CompleteButton } from "./CompleteButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Séance Reboot" };

export default async function RebootSessionPage({ params }: { params: { sessionId: string } }) {
  const session = await auth();
  if (!session) redirect("/login");
  const clientId = session.user.id;

  let data: Awaited<ReturnType<typeof getRebootSessionWithExercises>> = null;
  let completed = false;

  try {
    [data, completed] = await Promise.all([
      getRebootSessionWithExercises(params.sessionId),
      isSessionCompleted(clientId, params.sessionId),
    ]);
  } catch { return notFound(); }

  if (!data) return notFound();
  const { session: rebootSession, exercises } = data;

  return (
    <div className="space-y-5">
      <Link href="/reboot" className="inline-flex items-center gap-1.5 text-d5-muted text-sm hover:text-white transition-colors">
        <ArrowLeft size={14} />Retour au challenge
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
            rebootSession.location === "salle" ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"
          }`}>{rebootSession.location === "salle" ? "Salle" : "Maison"}</span>
        </div>
        <h1 className="text-xl font-bold text-white">{rebootSession.name}</h1>
        {rebootSession.description && <p className="text-d5-muted text-sm mt-1">{rebootSession.description}</p>}
        <div className="flex items-center gap-3 mt-2 text-xs text-d5-muted">
          <span>{exercises.length} exercices</span>
          {rebootSession.duration_minutes && <span>⏱ {rebootSession.duration_minutes} min</span>}
        </div>
      </div>

      {exercises.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-sm">Programme de la séance</h2>
          {exercises.map((ex, i) => (
            <div key={ex.id} className="card">
              {ex.vimeo_video_id && (
                <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-black">
                  <iframe src={`https://player.vimeo.com/video/${ex.vimeo_video_id}?badge=0&autopause=0&player_id=0`}
                    className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={ex.name} />
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-d5-surface-2 flex items-center justify-center shrink-0">
                  <span className="text-d5-muted text-xs font-bold">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{ex.name}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {ex.sets && ex.reps && <span className="text-d5-gold text-xs font-semibold">{ex.sets} × {ex.reps}</span>}
                    {ex.rest_seconds && <span className="text-d5-muted text-xs">{ex.rest_seconds}s repos</span>}
                  </div>
                  {ex.notes && <p className="text-d5-muted text-xs mt-1 italic">{ex.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-6">
          <p className="text-d5-muted text-sm">Les exercices arrivent bientôt…</p>
        </div>
      )}

      <div className="pt-2 pb-4">
        {completed ? (
          <div className="card border-d5-gold/30 bg-d5-gold/5 flex items-center justify-center gap-2 py-4">
            <CheckCircle2 size={18} className="text-d5-gold" />
            <p className="text-d5-gold font-semibold text-sm">Séance complétée !</p>
          </div>
        ) : (
          <CompleteButton clientId={clientId} sessionId={params.sessionId} sessionName={rebootSession.name} />
        )}
      </div>
    </div>
  );
}
