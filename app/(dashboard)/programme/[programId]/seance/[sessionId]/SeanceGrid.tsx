"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SessionExercise } from "@/lib/queries/programme";
import { saveManualWeightLogs, getExerciseWeightHistory } from "./seance-actions";

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

type HistoryEntry = { date: string; entries: { reps: string | null; weight: string | null }[] };

function ExerciseCard({
  exercise,
  index,
  checked,
  clientId,
  weights,
  onCheck,
  onVideoClick,
  onWeightChange,
}: {
  exercise: SessionExercise;
  index: number;
  checked: boolean;
  clientId: string;
  weights: string[];
  onCheck: () => void;
  onVideoClick: () => void;
  onWeightChange: (setIndex: number, value: string) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const hasVideo = !!exercise.vimeo_video_id;
  const thumbnail = exercise.thumbnail_url ?? null;

  const seriesLabel = exercise.sets
    ? `${exercise.sets} série${exercise.sets > 1 ? "s" : ""}`
    : "1 phase";

  const stats: { label: string; value: string }[] = [];
  if (exercise.reps) stats.push({ label: "Reps", value: exercise.reps });
  if (exercise.rest_seconds)
    stats.push({ label: "Récup.", value: formatRest(exercise.rest_seconds) });

  async function handleHistoryToggle() {
    if (!showHistory && history.length === 0) {
      setLoadingHistory(true);
      const h = await getExerciseWeightHistory(exercise.id, clientId);
      setHistory(h);
      setLoadingHistory(false);
    }
    setShowHistory((v) => !v);
  }

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
          <img src={thumbnail} alt={exercise.name} className="w-full h-full object-cover" />
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

        {/* Une case par serie. La premiere valeur sert de reference : les
            suivantes l'affichent en placeholder, l'athlete ne saisit que ce qui
            change d'une serie a l'autre. */}
        <div className="flex items-end gap-2 pt-1">
          <div className="flex-1 min-w-0 flex gap-1">
            {weights.map((w, i) => (
              <div key={i} className="flex-1 min-w-0">
                <label className="block text-[9px] text-gray-600 text-center leading-none mb-0.5">
                  S{i + 1}
                </label>
                <input
                  type="text"
                  value={w}
                  onChange={(e) => onWeightChange(i, e.target.value)}
                  placeholder={
                    i > 0 && weights[0].trim()
                      ? weights[0].trim()
                      : exercise.weight ?? "kg"
                  }
                  inputMode="decimal"
                  aria-label={`Charge série ${i + 1}`}
                  className="w-full min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-1 py-1.5 text-white text-xs text-center font-semibold focus:outline-none focus:border-d5-gold placeholder-gray-600"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleHistoryToggle}
            className={`shrink-0 p-1.5 rounded-lg transition-colors ${
              showHistory ? "bg-d5-gold/20 text-d5-gold" : "bg-gray-800 text-gray-500 hover:text-white"
            }`}
            style={{ marginBottom: 1 }}
            title="Historique des charges"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="border-t border-gray-800 pt-2 space-y-1.5">
            {loadingHistory ? (
              <p className="text-gray-500 text-xs text-center py-1">Chargement…</p>
            ) : history.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-1">Aucun historique</p>
            ) : (
              history.map((session, i) => (
                <div key={i}>
                  <p className="text-gray-500 text-xs">
                    {new Intl.DateTimeFormat("fr-FR", {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(session.date))}
                  </p>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {session.entries.map((e, j) => (
                      <span key={j} className="text-white text-xs font-semibold">
                        {e.weight ?? "—"}
                        {e.reps ? ` × ${e.reps}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
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
  clientId,
}: {
  exercises: SessionExercise[];
  programId: string;
  sessionId: string;
  clientId: string;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // Une entree par serie. Les exercices sans nombre de series defini gardent
  // une seule case.
  const [weights, setWeights] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      exercises.map((ex) => [ex.id, Array(Math.max(1, ex.sets ?? 1)).fill("")])
    )
  );
  const [showModal, setShowModal] = useState(false);
  const [videoExercise, setVideoExercise] = useState<SessionExercise | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const router = useRouter();

  // Ouvrir une video en plein ecran, tourner le telephone, puis revenir suffit
  // a ce qu'iOS purge la WKWebView sous pression memoire : la page se recharge
  // et tout l'etat React disparait — exercices coches et charges saisies. On
  // recopie donc la progression en local pour pouvoir la restaurer.
  const storageKey = `d5:seance:${sessionId}`;
  const restoredRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        checked?: string[];
        weights?: Record<string, string[]>;
        startedAt?: number;
      };

      if (Array.isArray(saved.checked)) {
        const known = new Set(exercises.map((e) => e.id));
        setChecked(new Set(saved.checked.filter((id) => known.has(id))));
      }

      if (saved.weights) {
        setWeights((current) => {
          const merged: Record<string, string[]> = { ...current };
          for (const ex of exercises) {
            const size = Math.max(1, ex.sets ?? 1);
            const previous = saved.weights?.[ex.id];
            if (!previous) continue;
            // Le programme a pu changer depuis : on recale sur le nombre de
            // series actuel plutot que de faire confiance a la taille sauvee.
            merged[ex.id] = Array.from({ length: size }, (_, i) => previous[i] ?? "");
          }
          return merged;
        });
      }

      if (typeof saved.startedAt === "number") startTimeRef.current = saved.startedAt;
    } catch {
      // Navigation privee ou JSON corrompu : la seance demarre a zero.
    } finally {
      restoredRef.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    // Ne pas ecraser la sauvegarde avant d'avoir tente de la lire.
    if (!restoredRef.current) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          checked: Array.from(checked),
          weights,
          startedAt: startTimeRef.current,
        })
      );
    } catch {
      // Stockage plein : la seance continue, sans reprise possible.
    }
  }, [checked, weights, storageKey]);

  const clearSaved = () => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
  };

  const toggle = (id: string) => {
    const wasChecked = checked.has(id);
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // A la validation, on enregistre toutes les series saisies. Une case vide
    // apres une case remplie herite de la premiere valeur, qui est ce que
    // l'athlete voit en placeholder.
    if (!wasChecked) {
      const entered = weights[id] ?? [];
      const reference = entered[0]?.trim() ?? "";
      const sets = entered.map((w, i) => ({
        setIndex: i + 1,
        weight: w.trim() || (i > 0 ? reference : ""),
        reps: "",
      }));
      if (sets.some((s) => s.weight)) {
        saveManualWeightLogs(clientId, id, sets).catch(console.error);
      }
    }
  };

  const total = exercises.length;
  const done = checked.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 100;

  const goToBilan = () => {
    clearSaved();
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
            clientId={clientId}
            weights={weights[ex.id] ?? [""]}
            onCheck={() => toggle(ex.id)}
            onVideoClick={() => setVideoExercise(ex)}
            onWeightChange={(setIndex, value) =>
              setWeights((prev) => {
                const next = [...(prev[ex.id] ?? [""])];
                next[setIndex] = value;
                return { ...prev, [ex.id]: next };
              })
            }
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
                Vous n’avez pas complété la séance à 100%
              </p>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-400 text-sm">
              Pourcentage d’exercices marqués comme fait :{" "}
              <span className="text-white font-semibold">{pct}%</span>
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
                J’ai fait tous les exercices
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
