import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/queries/programme";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Séance" };

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min${s}s` : `${m}min`;
}

export default async function SeancePage({
  params,
}: {
  params: { programId: string; sessionId: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const seance = await getSession(params.sessionId, session.user.id);
  if (!seance || seance.program_id !== params.programId) notFound();

  const execUrl = `/programme/${params.programId}/seance/${params.sessionId}/executer`;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/programme" className="text-d5-muted text-sm flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {seance.program_name}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{seance.name}</h1>
            <p className="text-d5-muted text-sm mt-1">
              {seance.week_number ? `Semaine ${seance.week_number}` : ""}
              {seance.week_number && seance.day_of_week !== null ? " · " : ""}
              {seance.day_of_week !== null ? DAY_NAMES[seance.day_of_week] : ""}
            </p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-d5-gold font-bold text-lg">{seance.exercises.length}</p>
            <p className="text-d5-muted text-xs">exercice{seance.exercises.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Lecture automatique — top CTA */}
      {seance.exercises.length > 0 && (
        <Link
          href={execUrl}
          className="flex items-center justify-center gap-3 w-full py-4 bg-d5-gold hover:bg-d5-gold/90 text-black font-bold rounded-2xl transition-colors active:scale-[0.98] text-base"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Lecture automatique de la séance
        </Link>
      )}

      {seance.exercises.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <p className="text-d5-muted text-sm">Aucun exercice dans cette séance</p>
        </div>
      ) : (
        <div className="space-y-5">
          {seance.exercises.map((ex, i) => (
            <div key={ex.id} className="card space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-d5-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-d5-gold font-bold text-xs">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-semibold">{ex.name}</h2>
                  {ex.rpe && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-orange-500/10 text-orange-400 text-xs rounded-full">
                      RPE {ex.rpe}
                    </span>
                  )}
                </div>
              </div>

              {ex.vimeo_video_id && (
                <div className="rounded-xl overflow-hidden bg-black aspect-video">
                  <iframe
                    src={`https://player.vimeo.com/video/${ex.vimeo_video_id}?title=0&byline=0&portrait=0&badge=0`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {ex.notes && (
                <div className="bg-d5-surface-2 rounded-xl p-3">
                  <p className="text-d5-muted text-xs leading-relaxed">{ex.notes}</p>
                </div>
              )}

              {ex.sets && ex.sets > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 pb-1.5 border-b border-d5-border">
                    <p className="text-d5-muted text-xs uppercase tracking-wider">Série</p>
                    <p className="text-d5-muted text-xs uppercase tracking-wider text-center">Reps</p>
                    <p className="text-d5-muted text-xs uppercase tracking-wider text-center">Charge</p>
                    <p className="text-d5-muted text-xs uppercase tracking-wider text-center">Récup.</p>
                  </div>
                  {Array.from({ length: ex.sets }).map((_, j) => (
                    <div key={j} className="grid grid-cols-4 gap-2 py-2 border-b border-d5-border/50 last:border-0">
                      <p className="text-d5-gold font-bold text-sm">{j + 1}</p>
                      <p className="text-white text-sm text-center">{ex.reps ?? "—"}</p>
                      <p className="text-white text-sm text-center">{ex.weight ?? "—"}</p>
                      <p className="text-d5-muted text-sm text-center">
                        {ex.rest_seconds ? formatRest(ex.rest_seconds) : "—"}
                      </p>
                    </div>
                  ))}
                  {ex.tempo && (
                    <p className="text-d5-muted text-xs pt-1">
                      Tempo : <span className="text-white">{ex.tempo}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Terminer la séance — bottom CTA */}
      {seance.exercises.length > 0 && (
        <Link
          href={execUrl}
          className="block w-full py-4 border-2 border-d5-gold text-d5-gold font-bold text-center rounded-2xl transition-colors active:scale-[0.98] text-base hover:bg-d5-gold/10"
        >
          Terminer la séance
        </Link>
      )}
    </div>
  );
}
