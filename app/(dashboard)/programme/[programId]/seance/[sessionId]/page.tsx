import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/queries/programme";
import { SeanceGrid } from "./SeanceGrid";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Séance" };

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

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
      {/* Header */}
      <div>
        <Link href="/programme" className="text-d5-muted text-sm flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {seance.program_name}
        </Link>
        <h1 className="text-2xl font-bold text-white">{seance.name}</h1>
        <p className="text-d5-muted text-sm mt-1">
          {seance.week_number ? `Semaine ${seance.week_number}` : ""}
          {seance.week_number && seance.day_of_week !== null ? " · " : ""}
          {seance.day_of_week !== null ? DAY_NAMES[seance.day_of_week] : ""}
        </p>
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

      {/* Exercise grid or empty state */}
      {seance.exercises.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-d5-muted text-sm">Aucun exercice dans cette séance</p>
        </div>
      ) : (
        <SeanceGrid exercises={seance.exercises} />
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
