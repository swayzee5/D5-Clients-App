"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SessionExercise } from "@/lib/queries/programme";

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min${s}s` : `${m}min`;
}

function VideoModal({
  exercise,
  onClose,
}: {
  exercise: SessionExercise;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-gray-900 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <p className="text-white font-bold text-sm truncate">{exercise.name}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-white ml-3 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ aspectRatio: "16/9" }}>
          <iframe
            src={`https://player.vimeo.com/video/${exercise.vimeo_video_id}?autoplay=1&title=0&byline=0&portrait=0`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  index,
  checked,
  onCheck,
  onVideoClick,
}: {
  exercise: SessionExercise;
  index: number;
  checked: boolean;
  onCheck: () => void;
  onVideoClick: () => void;
}) {
  const hasVideo = !!exercise.vimeo_video_id;
  const thumbnail = exercise.thumbnail_url ?? null;

  const seriesLabel = exercise.sets
    ? `${exercise.sets} série${exercise.sets > 1 ? "s" : ""}`
    : "1 phase";

  const stats: { label: string; value: string }[] = [];
  if (exercise.weight) stats.push({ label: "Charge", value: exercise.weight });
  if (exercise.reps) stats.push({ label: "Reps", value: exercise.reps });
  if (stats.length < 2 && exercise.rest_seconds)
    stats.push({ label: "Récup.", value: formatRest(exercise.rest_seconds) });

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border transition-all ${
        checked ? "border-d5-gold/50 opacity-60" : "border-gray-800 bg-gray-900"
      }`}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="px-2.5 py-0.5 border-2 border-d5-gold text-d5-gold text-xs font-bold rounded-full whitespace-nowrap">
          {seriesLabel}
        </span>
        <button
          onClick={onCheck}
          aria-label="Marquer comme fait"
          className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            checked ? "bg-d5-gold border-d5-gold" : "border-gray-600 hover:border-d5-gold/60"
          }`}
        >
          {checked && (
            <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`mx-3 rounded-xl overflow-hidden bg-gray-800 relative ${
          hasVideo ? "cursor-pointer" : ""
        }`}
        style={{ aspectRatio: "4/3" }}
        onClick={hasVideo ? onVideoClick : undefined}
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={exercise.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-black text-gray-700">{index + 1}</span>
          </div>
        )}
        {hasVideo && thumbnail && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <p className="text-white font-bold text-sm leading-tight">
          {index + 1} – {exercise.name}
        </p>
        {stats.length > 0 && (
          <div className="flex gap-4">
            {stats.slice(0, 2).map((s) => (
              <div key={s.label}>
                <p className="text-gray-500 text-xs">{s.label}</p>
                <p className="text-white font-semibold text-sm">{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SeanceGrid({
  exercises,
  programId,
  sessionId,
}: {
  exercises: SessionExercise[];
  programId: string;
  sessionId: string;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [videoExercise, setVideoExercise] = useState<SessionExercise | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const router = useRouter();

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const total = exercises.length;
  const done = checked.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 100;

  const goToBilan = () => {
    const dur = Math.round((Date.now() - startTimeRef.current) / 1000);
    router.push(`/programme/${programId}/seance/${sessionId}/bilan?dur=${dur}`);
  };

  const handleTerminer = () => {
    if (pct < 100) setShowModal(true);
    else goToBilan();
  };

  const handleAllDone = () => {
    setChecked(new Set(exercises.map((e) => e.id)));
    setShowModal(false);
    goToBilan();
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            index={i}
            checked={checked.has(ex.id)}
            onCheck={() => toggle(ex.id)}
            onVideoClick={() => setVideoExercise(ex)}
          />
        ))}
      </div>

      <button
        onClick={handleTerminer}
        className="mt-4 block w-full py-4 border-2 border-d5-gold text-d5-gold font-bold text-center rounded-2xl transition-colors active:scale-[0.98] text-base hover:bg-d5-gold/10"
      >
        Terminer la séance
      </button>

      {videoExercise && (
        <VideoModal exercise={videoExercise} onClose={() => setVideoExercise(null)} />
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-white text-base leading-snug">
                Vous n'avez pas complété la séance à 100%
              </p>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-400 text-sm">
              Pourcentage d'exercices marqués comme fait : <span className="text-white font-semibold">{pct}%</span>
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowModal(false); goToBilan(); }}
                className="w-full py-3.5 bg-d5-gold hover:bg-d5-gold/90 text-black font-bold rounded-xl transition-colors text-sm"
              >
                Confirmer sans terminer les exercices
              </button>
              <button
                onClick={handleAllDone}
                className="w-full py-3.5 border-2 border-d5-gold text-d5-gold font-bold rounded-xl hover:bg-d5-gold/10 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                J'ai fait tous les exercices
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
