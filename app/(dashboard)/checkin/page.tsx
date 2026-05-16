"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { submitCheckin } from "./actions"

const ENERGY = ["😴", "😪", "🙂", "😊", "💪"]
const SLEEP  = ["😴", "😪", "🙂", "😊", "⭐"]
const STRESS = ["😰", "😟", "😐", "🙂", "😌"]

function ScaleSelector({
  label, emojis, value, onChange, sublabels,
}: {
  label: string
  emojis: string[]
  value: number
  onChange: (v: number) => void
  sublabels?: [string, string]
}) {
  return (
    <div className="card space-y-3">
      <p className="font-semibold text-white">{label}</p>
      {sublabels && (
        <div className="flex justify-between text-xs text-d5-muted">
          <span>{sublabels[0]}</span>
          <span>{sublabels[1]}</span>
        </div>
      )}
      <div className="flex justify-between gap-2">
        {emojis.map((emoji, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            className={`flex-1 py-3 rounded-xl text-2xl transition-all ${
              value === i + 1
                ? "bg-d5-gold/20 border-2 border-d5-gold scale-110"
                : "bg-d5-surface-2 border-2 border-transparent hover:border-d5-border"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CheckinPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [energy, setEnergy] = useState(3)
  const [sleep, setSleep]   = useState(3)
  const [stress, setStress] = useState(3)
  const [weight, setWeight] = useState("")
  const [note, setNote]     = useState("")

  function handleSubmit() {
    startTransition(async () => {
      await submitCheckin(energy, sleep, stress, weight, note)
      router.push("/dashboard")
    })
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-xl text-d5-muted hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Check-in semaine</h1>
          <p className="text-d5-muted text-xs">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      <ScaleSelector
        label="⚡ Énergie cette semaine"
        emojis={ENERGY}
        value={energy}
        onChange={setEnergy}
        sublabels={["Très faible", "Excellent"]}
      />

      <ScaleSelector
        label="🌙 Qualité du sommeil"
        emojis={SLEEP}
        value={sleep}
        onChange={setSleep}
        sublabels={["Très mauvais", "Excellent"]}
      />

      <ScaleSelector
        label="🧠 Niveau de stress"
        emojis={STRESS}
        value={stress}
        onChange={setStress}
        sublabels={["Très stressé", "Très détendu"]}
      />

      <div className="card space-y-2">
        <p className="font-semibold text-white">⚖️ Poids (optionnel)</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder="ex: 75.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="flex-1 bg-d5-surface-2 rounded-xl px-4 py-3 text-white text-sm placeholder:text-d5-muted focus:outline-none border border-transparent focus:border-d5-gold/50"
          />
          <span className="text-d5-muted font-medium">kg</span>
        </div>
      </div>

      <div className="card space-y-2">
        <p className="font-semibold text-white">💬 Comment s&apos;est passée ta semaine ?</p>
        <textarea
          placeholder="Partage ce que tu veux avec ton coach..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="w-full bg-d5-surface-2 rounded-xl px-4 py-3 text-white text-sm placeholder:text-d5-muted focus:outline-none border border-transparent focus:border-d5-gold/50 resize-none"
        />
      </div>

      <div className="space-y-3">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full py-4 rounded-2xl bg-d5-gold text-black font-bold text-base disabled:opacity-60"
        >
          {isPending ? "Envoi..." : "Envoyer au coach"}
        </button>
        <button
          onClick={() => router.back()}
          className="w-full py-3 rounded-2xl border border-d5-border text-d5-muted font-medium text-sm"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
