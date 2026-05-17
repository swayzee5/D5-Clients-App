"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { submitMidCheckin } from "./actions";

const ENERGY_OPTIONS: [string, string][] = [
  ["😴", "Épuisé"],
  ["😪", "Fatigué"],
  ["🙂", "Correct"],
  ["😊", "Bien"],
  ["💪", "En feu !"],
];

const SLEEP_OPTIONS: [string, string][] = [
  ["😴", "Très mauvais"],
  ["😪", "Mauvais"],
  ["🙂", "Correct"],
  ["😊", "Bon"],
  ["⭐", "Excellent"],
];

function ScoreRow({
  options,
  value,
  onChange,
}: {
  options: [string, string][];
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {options.map(([emoji], i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            className={`flex-1 py-3 rounded-xl text-2xl transition-all active:scale-95 ${
              value === i + 1
                ? "bg-d5-gold/20 border border-d5-gold scale-110"
                : "bg-d5-surface-2 border border-d5-border hover:border-white/20"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      {value !== null && (
        <p className="text-d5-muted text-xs text-center">{options[value - 1][1]}</p>
      )}
    </div>
  );
}

export function CheckinForm() {
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [feeling, setFeeling] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const hasAnyInput = energy !== null || sleep !== null || weight !== "" || feeling !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    if (energy !== null) formData.set("energy", String(energy));
    if (sleep !== null) formData.set("sleepQuality", String(sleep));
    if (weight) formData.set("weight", weight);
    if (feeling.trim()) formData.set("feeling", feeling.trim());

    startTransition(async () => {
      await submitMidCheckin(formData);
      setDone(true);
      setTimeout(() => router.push("/reboot"), 1500);
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-400" />
        </div>
        <p className="text-white font-bold text-lg">Check-in envoyé !</p>
        <p className="text-d5-muted text-sm">Ton coach a été notifié. Retour au challenge…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/reboot"
        className="inline-flex items-center gap-1.5 text-d5-muted text-sm hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        Retour au challenge
      </Link>

      <div>
        <h1 className="text-xl font-bold text-white">Check-in mi-challenge</h1>
        <p className="text-d5-muted text-sm mt-1">J4 · Ton ressenti à mi-parcours</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Energy */}
        <div className="card space-y-3">
          <p className="text-white font-medium text-sm">
            Comment est ton niveau d’énergie en ce moment ?
          </p>
          <ScoreRow options={ENERGY_OPTIONS} value={energy} onChange={setEnergy} />
        </div>

        {/* Sleep */}
        <div className="card space-y-3">
          <p className="text-white font-medium text-sm">
            Quelle est la qualité de ton sommeil depuis le début ?
          </p>
          <ScoreRow options={SLEEP_OPTIONS} value={sleep} onChange={setSleep} />
        </div>

        {/* Weight */}
        <div className="card space-y-2">
          <p className="text-white font-medium text-sm">
            Ton poids actuel{" "}
            <span className="text-d5-muted font-normal">(optionnel)</span>
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.1"
              min="30"
              max="250"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="ex : 78.5"
              className="flex-1 bg-d5-surface-2 border border-d5-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-d5-gold"
            />
            <span className="text-d5-muted">kg</span>
          </div>
        </div>

        {/* Feeling */}
        <div className="card space-y-2">
          <p className="text-white font-medium text-sm">
            Comment tu te sens ?{" "}
            <span className="text-d5-muted font-normal">(optionnel)</span>
          </p>
          <textarea
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            placeholder="Motivé, quelques courbatures, manque de temps… Dis tout !"
            rows={3}
            className="w-full bg-d5-surface-2 border border-d5-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-d5-gold resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || !hasAnyInput}
          className="w-full py-4 bg-d5-gold text-black font-bold rounded-xl text-sm disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          {isPending ? "Envoi…" : "Envoyer mon check-in →"}
        </button>
      </form>
    </div>
  );
}
