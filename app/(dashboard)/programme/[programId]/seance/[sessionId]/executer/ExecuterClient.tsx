"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  startWorkoutSession,
  saveSetPerformance,
  completeWorkoutSession,
  saveSessionNote,
  getExerciseHistory,
} from "./actions";
import type { ProgramSession } from "@/lib/queries/programme";

type Props = {
  seance: ProgramSession & { program_id: string; program_name: string };
  clientId: string;
  programId: string;
};

type HistoryEntry = {
  date: string;
  sets: { reps: number | null; weight: string | null }[];
};

export function ExecuterClient({ seance, clientId, programId }: Props) {
  const router = useRouter();
  const exercises = seance.exercises;

  const [workoutSessionId, setWorkoutSessionId] = useState<string | null>(null);
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentExercise = exercises[exerciseIdx];
  const totalSets = currentExercise?.sets ?? 1;

  const totalSetsAll = exercises.reduce((acc, ex) => acc + (ex.sets ?? 1), 0);
  const completedSets =
    exercises.slice(0, exerciseIdx).reduce((acc, ex) => acc + (ex.sets ?? 1), 0) + setIdx;
  const progress = totalSetsAll > 0 ? Math.round((completedSets / totalSetsAll) * 100) : 0;

  useEffect(() => {
    startWorkoutSession(seance.id, clientId, programId).then(setWorkoutSessionId);
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    setReps("");
    setWeight(currentExercise?.weight ?? "");
  }, [exerciseIdx, setIdx]);

  useEffect(() => {
    if (!isResting) return;
    timerRef.current = setInterval(() => {
      setRestTimeLeft((prev) => {
        if (prev <= 1) {
          setIsResting(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isResting]);

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  async function handleNext() {
    if (!workoutSessionId || !currentExercise || isSaving) return;
    setIsSaving(true);
    await saveSetPerformance(
      workoutSessionId,
      currentExercise.id,
      setIdx,
      reps ? parseInt(reps) : null,
      weight,
      currentExercise.rest_seconds,
      currentExercise.tempo ?? ""
    );
    setIsSaving(false);

    const isLastSet = setIdx >= totalSets - 1;
    const isLastExercise = exerciseIdx >= exercises.length - 1;

    if (isLastSet && isLastExercise) {
      await handleComplete();
      return;
    }

    const restSecs = currentExercise.rest_seconds ?? 0;
    if (restSecs > 0) {
      setIsResting(true);
      setRestTimeLeft(restSecs);
    }

    if (isLastSet) {
      setExerciseIdx((prev) => prev + 1);
      setSetIdx(0);
    } else {
      setSetIdx((prev) => prev + 1);
    }
  }

  async function handleComplete() {
    if (!workoutSessionId || isCompleting) return;
    setIsCompleting(true);
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    await completeWorkoutSession(workoutSessionId, duration);
    router.push(`/programme/${programId}/seance/${seance.id}`);
  }

  async function handleSaveNote() {
    if (!workoutSessionId || !noteText.trim()) return;
    await saveSessionNote(workoutSessionId, clientId, noteText);
    setNoteText("");
    setShowNote(false);
  }

  async function handleShowHistory() {
    if (!currentExercise) return;
    const h = await getExerciseHistory(currentExercise.id, clientId);
    setHistory(h);
    setShowHistory(true);
  }

  if (!currentExercise) return null;

  return (
    <div className="-mx-4 -mt-4 min-h-screen bg-d5-bg flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-d5-border">
        <button
          onClick={() => router.push(`/programme/${programId}/seance/${seance.id}`)}
          className="w-8 h-8 flex items-center justify-center text-d5-muted hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-sm">
            Série {setIdx + 1}/{totalSets}
          </p>
          <p className="text-d5-muted text-xs truncate max-w-[160px]">{currentExercise.name}</p>
        </div>
        {isResting ? (
          <div className="text-d5-gold font-bold text-sm">{formatTime(restTimeLeft)}</div>
        ) : (
          <div className="text-d5-muted text-sm">{progress}%</div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-d5-surface-2">
        <div
          className="h-1 bg-d5-gold transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Rest mode */}
      {isResting ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
          <p className="text-d5-muted text-sm uppercase tracking-wider">Récupération</p>
          <p className="text-8xl font-black text-white tabular-nums">{formatTime(restTimeLeft)}</p>
          <p className="text-d5-muted text-sm">
            Prochain : {setIdx + 1 < totalSets ? `Série ${setIdx + 2}` : exercises[exerciseIdx + 1]?.name ?? "Terminé"}
          </p>
          <div className="flex gap-3 w-full max-w-sm">
            <button
              onClick={() => setRestTimeLeft((p) => p + 10)}
              className="flex-1 py-3 bg-d5-surface-2 text-white rounded-2xl font-semibold text-sm"
            >
              +10s
            </button>
            <button
              onClick={() => { setIsResting(false); if (timerRef.current) clearInterval(timerRef.current); }}
              className="flex-1 py-3 bg-d5-gold text-black rounded-2xl font-bold text-sm"
            >
              Passer →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Exercise info */}
          <div className="flex-1 flex flex-col px-4 pt-5 gap-5 overflow-y-auto">
            <div>
              <h2 className="text-white text-xl font-bold">{currentExercise.name}</h2>
              {currentExercise.notes && (
                <p className="text-d5-muted text-xs mt-1 leading-relaxed">{currentExercise.notes}</p>
              )}
            </div>

            {/* Target */}
            <div className="flex gap-4">
              {currentExercise.reps && (
                <div className="card flex-1 text-center">
                  <p className="text-d5-muted text-xs mb-1">Cible reps</p>
                  <p className="text-white font-bold text-lg">{currentExercise.reps}</p>
                </div>
              )}
              {currentExercise.weight && (
                <div className="card flex-1 text-center">
                  <p className="text-d5-muted text-xs mb-1">Charge cible</p>
                  <p className="text-white font-bold text-lg">{currentExercise.weight}</p>
                </div>
              )}
              {currentExercise.rest_seconds && (
                <div className="card flex-1 text-center">
                  <p className="text-d5-muted text-xs mb-1">Récup.</p>
                  <p className="text-white font-bold text-lg">
                    {formatTime(currentExercise.rest_seconds)}
                  </p>
                </div>
              )}
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-d5-muted text-xs mb-2">Reps réalisées</label>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder={currentExercise.reps ?? "—"}
                  className="w-full bg-d5-surface-2 border border-d5-border rounded-xl px-4 py-3 text-white text-lg text-center font-bold focus:outline-none focus:border-d5-gold"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-d5-muted text-xs mb-2">Charge (kg/lb)</label>
                <input
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={currentExercise.weight ?? "—"}
                  className="w-full bg-d5-surface-2 border border-d5-border rounded-xl px-4 py-3 text-white text-lg text-center font-bold focus:outline-none focus:border-d5-gold"
                  inputMode="decimal"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowNote(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-d5-surface-2 text-d5-muted hover:text-white rounded-xl text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Note coach
              </button>
              <button
                onClick={handleShowHistory}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-d5-surface-2 text-d5-muted hover:text-white rounded-xl text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Historique
              </button>
            </div>
          </div>

          {/* Bottom */}
          <div className="px-4 py-4 border-t border-d5-border space-y-3">
            <button
              onClick={handleNext}
              disabled={isSaving || isCompleting}
              className="w-full py-4 bg-d5-gold hover:bg-d5-gold/90 disabled:opacity-60 text-black font-bold rounded-2xl text-base transition-colors active:scale-[0.98]"
            >
              {isSaving
                ? "Sauvegarde..."
                : isCompleting
                ? "Fin..."
                : setIdx >= totalSets - 1 && exerciseIdx >= exercises.length - 1
                ? "Terminer la séance ✓"
                : `Suivant →`}
            </button>
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="w-full py-2 text-d5-muted text-sm text-center hover:text-white transition-colors"
            >
              Terminer la séance
            </button>
          </div>
        </>
      )}

      {/* Note modal */}
      {showNote && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full bg-d5-surface rounded-t-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold">Note pour le coach</h3>
              <button onClick={() => setShowNote(false)} className="text-d5-muted hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ex: ressenti difficile sur le dos, douleur légère au genou..."
              rows={4}
              className="w-full bg-d5-surface-2 border border-d5-border rounded-xl px-4 py-3 text-white text-sm placeholder-d5-muted focus:outline-none focus:border-d5-gold resize-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNote(false)}
                className="flex-1 py-3 bg-d5-surface-2 text-d5-muted rounded-xl text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveNote}
                className="flex-1 py-3 bg-d5-gold text-black font-bold rounded-xl text-sm"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full bg-d5-surface rounded-t-3xl p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold">{currentExercise.name}</h3>
              <button onClick={() => setShowHistory(false)} className="text-d5-muted hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-d5-muted text-sm text-center py-6">Aucun historique pour cet exercice</p>
            ) : (
              <div className="space-y-4">
                {history.map((entry, i) => (
                  <div key={i}>
                    <p className="text-d5-muted text-xs mb-2">
                      {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(entry.date))}
                    </p>
                    <div className="space-y-1">
                      {entry.sets.map((s, j) => (
                        <div key={j} className="flex justify-between text-sm">
                          <span className="text-d5-muted">Série {j + 1}</span>
                          <span className="text-white">
                            {s.reps ?? "—"} reps
                            {s.weight ? ` · ${s.weight}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
