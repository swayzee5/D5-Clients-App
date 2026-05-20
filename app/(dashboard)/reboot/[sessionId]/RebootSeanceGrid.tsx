"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RebootExercise } from "@/lib/queries/reboot";
import { completeSession, submitSessionCheckin, recordWhatsappSend } from "./actions";

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min${s}s` : `${m}min`;
}

const ENERGY_OPTIONS = [
  { value: 1, label: "😴" }, { value: 2, label: "😪" }, { value: 3, label: "🙂" },
  { value: 4, label: "😊" }, { value: 5, label: "⚡" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Trop facile" },
  { value: "good", label: "Parfait" },
  { value: "hard", label: "Très dur" },
];

type Step = "grid" | "checkin" | "whatsapp" | "done";

function ExerciseCard({ exercise, index, checked, onCheck }: {
  exercise: RebootExercise; index: number; checked: boolean; onCheck: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = exercise.vimeo_video_id && !imgError
    ? `https://i.vimeocdn.com/video/${exercise.vimeo_video_id}_640x360` : null;
  const seriesLabel = exercise.sets ? `${exercise.sets} série${exercise.sets > 1 ? "s" : ""}` : "1 phase";

  return (
    <div className={`relative rounded-2xl overflow-hidden border transition-all ${
      checked ? "border-d5-gold/50 opacity-60" : "border-gray-800 bg-gray-900"
    }`}>
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="px-2.5 py-0.5 border-2 border-d5-gold text-d5-gold text-xs font-bold rounded-full">{seriesLabel}</span>
        <button onClick={onCheck} aria-label="Marquer comme fait"
          className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            checked ? "bg-d5-gold border-d5-gold" : "border-gray-600 hover:border-d5-gold/60"
          }`}>
          {checked && <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
        </button>
      </div>
      <div className="mx-3 rounded-xl overflow-hidden bg-gray-800" style={{ aspectRatio: "4/3" }}>
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt={exercise.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-black text-gray-700">{index + 1}</span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-white font-bold text-sm leading-tight">{index + 1} – {exercise.name}</p>
        <div className="flex gap-4">
          {exercise.reps && <div><p className="text-gray-500 text-xs">Reps</p><p className="text-white font-semibold text-sm">{exercise.reps}</p></div>}
          {exercise.rest_seconds && <div><p className="text-gray-500 text-xs">Récup.</p><p className="text-white font-semibold text-sm">{formatRest(exercise.rest_seconds)}</p></div>}
        </div>
        {exercise.notes && <p className="text-gray-500 text-xs italic">{exercise.notes}</p>}
      </div>
    </div>
  );
}

export function RebootSeanceGrid({
  exercises, clientId, sessionId, sessionName, alreadyCompleted, completionsBefore,
}: {
  exercises: RebootExercise[];
  clientId: string;
  sessionId: string;
  sessionName: string;
  alreadyCompleted: boolean;
  completionsBefore: number;
}) {
  const [step, setStep] = useState<Step>("grid");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [energy, setEnergy] = useState(3);
  const [difficulty, setDifficulty] = useState("good");
  const [feeling, setFeeling] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const startTimeRef = useRef<number>(Date.now());
  const router = useRouter();

  // Ordinal for the WhatsApp message (1/3, 2/3, 3/3)
  const ordinal = completionsBefore < 3 ? completionsBefore + 1 : null;
  const whatsappMessage = ordinal
    ? `Séance ${ordinal}/3 validée 🔥🔥🔥${feeling ? `\n${feeling}` : ""}`
    : `Séance ${sessionName} validée 🔥🔥🔥${feeling ? `\n${feeling}` : ""}`;

  const toggle = (id: string) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const pct = exercises.length > 0 ? Math.round((checked.size / exercises.length) * 100) : 100;

  function handleTerminer() {
    if (pct < 100) { setShowModal(true); } else { triggerComplete(); }
  }

  function triggerComplete() {
    setShowModal(false);
    startTransition(async () => {
      await completeSession(clientId, sessionId);
      setStep("checkin");
    });
  }

  function handleCheckin() {
    startTransition(async () => {
      await submitSessionCheckin(clientId, sessionId, energy, difficulty, feeling);
      setStep("whatsapp");
    });
  }

  async function handleWhatsappSent() {
    if (ordinal !== null) {
      await recordWhatsappSend(clientId, sessionId);
    }
    finish();
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function finish() {
    setStep("done");
    setTimeout(() => router.push("/reboot"), 1500);
  }

  void startTimeRef;

  if (alreadyCompleted || step === "done") {
    return (
      <div className="card border-d5-gold/30 bg-d5-gold/5 flex flex-col items-center gap-2 py-8 text-center mt-4">
        <span className="text-4xl">{step === "done" ? "🎉" : "✅"}</span>
        <p className="text-white font-bold">{step === "done" ? "Séance validée !" : "Séance déjà complétée"}</p>
        {step === "done" && <p className="text-d5-muted text-sm">Retour au challenge…</p>}
      </div>
    );
  }

  if (step === "whatsapp") {
    return (
      <div className="card space-y-4 mt-4">
        <div className="text-center space-y-1">
          <p className="text-3xl">📲</p>
          <p className="text-white font-bold">Envoie ton message dans le groupe !</p>
          <p className="text-d5-muted text-xs">Copie le message et colle-le dans le groupe WhatsApp D5</p>
        </div>
        <div className="bg-d5-surface-2 border border-d5-gold/20 rounded-xl p-3.5">
          <p className="text-white text-sm leading-relaxed whitespace-pre-line">{whatsappMessage}</p>
        </div>
        <button onClick={copyMessage}
          className="w-full border border-d5-border hover:border-white/30 bg-d5-surface-2 text-white rounded-xl py-3 text-sm font-medium transition-all active:scale-[0.98]">
          {copied ? "✓ Copié !" : "Copier le message"}
        </button>
        <button onClick={handleWhatsappSent}
          className="w-full bg-d5-gold text-black font-bold rounded-xl py-3.5 text-sm transition-colors active:scale-[0.98]">
          Message envoyé ✓
        </button>
        <button onClick={finish} className="w-full text-center text-xs text-d5-muted hover:text-white py-1">
          Passer cette étape
        </button>
      </div>
    );
  }

  if (step === "checkin") {
    return (
      <div className="card space-y-5 mt-4">
        <div>
          <p className="text-white font-bold">Comment tu te sens ?</p>
          <p className="text-d5-muted text-xs mt-0.5">2 questions rapides</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-d5-muted font-semibold uppercase tracking-wider">Niveau d&apos;énergie</p>
          <div className="flex gap-2">
            {ENERGY_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setEnergy(opt.value)}
                className={`flex-1 py-3 rounded-xl border text-xl transition-all ${
                  energy === opt.value ? "border-d5-gold bg-d5-gold/10" : "border-d5-border bg-d5-surface-2"
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-d5-muted font-semibold uppercase tracking-wider">Difficulté</p>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setDifficulty(opt.value)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  difficulty === opt.value ? "border-d5-gold bg-d5-gold/10 text-white" : "border-d5-border bg-d5-surface-2 text-d5-muted"
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-d5-muted font-semibold uppercase tracking-wider">Un mot <span className="normal-case font-normal">(optionnel)</span></p>
          <textarea value={feeling} onChange={(e) => setFeeling(e.target.value)} rows={2}
            placeholder="Ex : j'ai senti mes pecs, genoux un peu sensibles…"
            className="w-full bg-d5-surface-2 border border-d5-border rounded-xl px-3 py-2.5 text-white text-sm placeholder-d5-muted focus:outline-none focus:border-d5-gold/40 resize-none" />
        </div>
        <button onClick={handleCheckin} disabled={isPending}
          className="w-full bg-d5-gold disabled:opacity-60 text-black font-bold rounded-xl py-3.5 text-sm active:scale-[0.98]">
          {isPending ? "Enregistrement…" : "Envoyer mon ressenti →"}
        </button>
        <button onClick={() => setStep("whatsapp")} className="w-full text-center text-xs text-d5-muted hover:text-white py-1">
          Passer cette étape
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {exercises.map((ex, i) => (
          <ExerciseCard key={ex.id} exercise={ex} index={i} checked={checked.has(ex.id)} onCheck={() => toggle(ex.id)} />
        ))}
      </div>
      <button onClick={handleTerminer} disabled={isPending}
        className="mt-4 w-full py-4 border-2 border-d5-gold text-d5-gold font-bold text-center rounded-2xl transition-colors active:scale-[0.98] hover:bg-d5-gold/10 disabled:opacity-60">
        {isPending ? "Validation…" : "Séance terminée !"}
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-white text-base">Séance pas complètement terminée</p>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-gray-400 text-sm">{pct}% des exercices cochés</p>
            <div className="space-y-3">
              <button onClick={triggerComplete} className="w-full py-3.5 bg-d5-gold text-black font-bold rounded-xl text-sm">Confirmer quand même</button>
              <button onClick={() => { setChecked(new Set(exercises.map((e) => e.id))); setShowModal(false); triggerComplete(); }}
                className="w-full py-3.5 border-2 border-d5-gold text-d5-gold font-bold rounded-xl text-sm">J'ai fait tous les exercices</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
