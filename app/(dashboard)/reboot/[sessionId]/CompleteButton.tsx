"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { completeSession, submitSessionCheckin } from "./actions";

type Step = "idle" | "checkin" | "done";

const ENERGY_OPTIONS = [
  { value: 1, label: "😴" },
  { value: 2, label: "😪" },
  { value: 3, label: "🙂" },
  { value: 4, label: "😊" },
  { value: 5, label: "⚡" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Trop facile" },
  { value: "good", label: "Parfait" },
  { value: "hard", label: "Très dur" },
];

export function CompleteButton({ clientId, sessionId }: { clientId: string; sessionId: string }) {
  const [step, setStep] = useState<Step>("idle");
  const [energy, setEnergy] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<string>("good");
  const [feeling, setFeeling] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleComplete() {
    if (!confirm("Marquer cette séance comme terminée ?")) return;
    startTransition(async () => {
      await completeSession(clientId, sessionId);
      setStep("checkin");
    });
  }

  function handleCheckin() {
    startTransition(async () => {
      await submitSessionCheckin(clientId, sessionId, energy, difficulty, feeling);
      setStep("done");
      setTimeout(() => router.push("/reboot"), 1500);
    });
  }

  if (step === "done") {
    return (
      <div className="card border-d5-gold/30 bg-d5-gold/5 flex flex-col items-center gap-2 py-6 text-center">
        <span className="text-4xl">🎉</span>
        <p className="text-white font-bold">Séance validée !</p>
        <p className="text-d5-muted text-sm">Retour au challenge…</p>
      </div>
    );
  }

  if (step === "checkin") {
    return (
      <div className="card space-y-5">
        <div>
          <p className="text-white font-bold">Comment tu te sens ?</p>
          <p className="text-d5-muted text-xs mt-0.5">2 questions rapides — aide ton coach à suivre ta progression</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-d5-muted font-semibold uppercase tracking-wider">Niveau d&apos;énergie</p>
          <div className="flex gap-2">
            {ENERGY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEnergy(opt.value)}
                className={`flex-1 py-3 rounded-xl border text-xl transition-all ${
                  energy === opt.value
                    ? "border-d5-gold bg-d5-gold/10"
                    : "border-d5-border bg-d5-surface-2 hover:border-white/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-d5-muted font-semibold uppercase tracking-wider">Difficulté</p>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  difficulty === opt.value
                    ? "border-d5-gold bg-d5-gold/10 text-white"
                    : "border-d5-border bg-d5-surface-2 text-d5-muted hover:border-white/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-d5-muted font-semibold uppercase tracking-wider">
            Un mot <span className="normal-case font-normal">(optionnel)</span>
          </p>
          <textarea
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            rows={2}
            placeholder="Ex : j’ai senti mes pecs, genoux un peu sensibles…"
            className="w-full bg-d5-surface-2 border border-d5-border rounded-xl px-3 py-2.5 text-white text-sm placeholder-d5-muted focus:outline-none focus:border-d5-gold/40 resize-none transition-colors"
          />
        </div>

        <button
          onClick={handleCheckin}
          disabled={isPending}
          className="w-full bg-d5-gold hover:bg-d5-gold/90 disabled:opacity-60 text-black font-bold rounded-xl py-3.5 text-sm transition-colors active:scale-[0.98]"
        >
          {isPending ? "Enregistrement…" : "Envoyer mon ressenti →"}
        </button>

        <button
          onClick={() => router.push("/reboot")}
          className="w-full text-center text-xs text-d5-muted hover:text-white transition-colors py-1"
        >
          Passer cette étape
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleComplete}
      disabled={isPending}
      className="w-full py-3.5 rounded-xl bg-d5-gold text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
    >
      {isPending ? (
        <span>Chargement...</span>
      ) : (
        <span className="flex items-center gap-2">
          <CheckCircle2 size={16} />
          Séance terminée !
        </span>
      )}
    </button>
  );
}
