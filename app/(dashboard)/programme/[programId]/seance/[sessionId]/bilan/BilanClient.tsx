"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { quickCompleteSession } from "./actions";

export function BilanClient({
  programId,
  sessionId,
  clientId,
  durationSeconds,
  workoutSessionId,
}: {
  programId: string;
  sessionId: string;
  clientId: string;
  durationSeconds: number | null;
  workoutSessionId?: string;
}) {
  const [rpe, setRpe] = useState(5);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = () => {
    startTransition(async () => {
      await quickCompleteSession(
        sessionId,
        clientId,
        programId,
        rpe,
        note,
        durationSeconds,
        workoutSessionId
      );
      router.push("/programme");
    });
  };

  const rpeLabels: Record<number, string> = {
    0: "Repos total",
    1: "Très facile",
    2: "Facile",
    3: "Modéré",
    4: "Un peu difficile",
    5: "Difficile",
    6: "Difficile",
    7: "Très difficile",
    8: "Très difficile",
    9: "Extrême",
    10: "Maximum absolu",
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Link
          href={`/programme/${programId}/seance/${sessionId}`}
          className="text-d5-muted text-sm flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">Comment a été votre entraînement ?</h1>
      </div>

      {/* RPE Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-white">Perception de l'effort général</h2>
        <div className="flex justify-between text-xs text-d5-muted px-0.5">
          <span>Faible</span>
          <span>Maximal</span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={rpe}
          onChange={(e) => setRpe(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-d5-gold"
        />
        <div className="flex justify-between text-xs text-gray-600">
          {Array.from({ length: 11 }, (_, i) => (
            <span key={i} className={i === rpe ? "text-d5-gold font-bold" : ""}>
              {i}
            </span>
          ))}
        </div>
        <div className="text-center pt-1">
          <span className="text-3xl font-black text-d5-gold">{rpe}</span>
          <span className="text-d5-muted text-sm ml-2">{rpeLabels[rpe]}</span>
        </div>
      </div>

      {/* Note Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-white">Note pour le coach</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Comment s'est passée la séance ? (optionnel)"
          rows={4}
          className="w-full bg-gray-800 rounded-xl p-3 text-white text-sm resize-none border border-gray-700 focus:border-d5-gold/50 outline-none placeholder-gray-600"
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full py-4 bg-d5-gold hover:bg-d5-gold/90 text-black font-bold rounded-2xl transition-colors active:scale-[0.98] disabled:opacity-60 text-base"
      >
        {isPending ? "Sauvegarde…" : "Sauvegarder"}
      </button>
    </div>
  );
}
