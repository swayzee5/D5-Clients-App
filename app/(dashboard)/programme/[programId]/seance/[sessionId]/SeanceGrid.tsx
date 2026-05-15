"use client";

import { useState } from "react";
import type { SessionExercise } from "@/lib/queries/programme";

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min${s}s` : `${m}min`;
}

function ExerciseCard({
  exercise,
  index,
  checked,
  onCheck,
}: {
  exercise: SessionExercise;
  index: number;
  checked: boolean;
  onCheck: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl =
    exercise.vimeo_video_id && !imgError
      ? `https://i.vimeocdn.com/video/${exercise.vimeo_video_id}_640x360`
      : null;

  const seriesLabel = exercise.sets
    ? `${exercise.sets} série${exercise.sets > 1 ? "s" : ""}`
    : "1 phase";

  // Pick up to 2 meaningful stats
  const stats: { label: string; value: string }[] = [];
  if (exercise.weight) stats.push({ label: "Charge", value: exercise.weight });
  if (exercise.reps) stats.push({ label: "Reps", value: exercise.reps });
  if (stats.length < 2 && exercise.rest_seconds)
    stats.push({ label: "Récup.", value: formatRest(exercise.rest_seconds) });
  if (stats.length === 0 && exercise.rest_seconds)
    stats.push({ label: "Récup.", value: formatRest(exercise.rest_seconds) });

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border transition-all ${
        checked
          ? "border-d5-gold/50 opacity-60"
          : "border-gray-800 bg-gray-900"
      }`}
    >
      {/* Badge + checkbox */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="px-2.5 py-0.5 border-2 border-d5-gold text-d5-gold text-xs font-bold rounded-full whitespace-nowrap">
          {seriesLabel}
        </span>
        <button
          onClick={onCheck}
          aria-label="Marquer comme fait"
          className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            checked
              ? "bg-d5-gold border-d5-gold"
              : "border-gray-600 hover:border-d5-gold/60"
          }`}
        >
          {checked && (
            <svg
              className="w-3.5 h-3.5 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Image */}
      <div className="mx-3 rounded-xl overflow-hidden bg-gray-800" style={{ aspectRatio: "4/3" }}>
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={exercise.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <span className="text-5xl font-black text-gray-700">{index + 1}</span>
          </div>
        )}
      </div>

      {/* Name + stats */}
      <div className="p-3 space-y-2">
        <p className="text-white font-bold text-sm leading-tight">
          {index + 1}&nbsp;–&nbsp;{exercise.name}
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

export function SeanceGrid({ exercises }: { exercises: SessionExercise[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="grid grid-cols-2 gap-3">
      {exercises.map((ex, i) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          index={i}
          checked={checked.has(ex.id)}
          onCheck={() => toggle(ex.id)}
        />
      ))}
    </div>
  );
}
