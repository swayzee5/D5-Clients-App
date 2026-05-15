"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Search, Check } from "lucide-react"
import Link from "next/link"
import { logFreeActivity } from "./actions"

const ACTIVITY_TYPES = [
  "Appareil de fitness", "Arts martiaux", "Arts martiaux mixtes", "Athlétisme", "Autre",
  "Aviron", "Badminton", "Baseball", "Basketball", "Beach volley", "Biathlon",
  "Boxe", "Canoë", "Cheerleading", "Circuit training", "Corde à sauter",
  "Cours de groupe", "Course à pied", "Course à pied tout terrain", "Course à pied urbaine",
  "Course dans le sable", "Course sur tapis roulant", "Cricket", "CrossFit",
  "Cyclisme", "Cyclisme en salle", "Danse", "Escalade", "Escrime",
  "Football", "Football américain", "Golf", "Gymnastique", "Handball",
  "Hockey", "Judo", "Karaté", "Kayak", "Kickboxing",
  "Lacrosse", "Lutte", "Marche", "Musculation", "Natation",
  "Padel", "Patinage", "Pilates", "Randonnée", "Roller",
  "Rugby", "Ski", "Ski de fond", "Snowboard", "Squash",
  "Surf", "Taekwondo", "Tennis", "Tennis de table", "Triathlon",
  "Vélo de route", "Volley-ball", "Yoga",
]

const RPE_LABELS = [
  "Repos total", "Très léger", "Léger", "Modéré léger", "Modéré",
  "Modéré intense", "Intense", "Très intense", "Difficile", "Très difficile", "Maximum absolu",
]

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function timeString(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60000)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export default function NouvelleActivitePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState(1)
  const [search, setSearch] = useState("")
  const [selectedType, setSelectedType] = useState("")

  const [title, setTitle] = useState("")
  const [date, setDate] = useState(todayString())
  const [startTime, setStartTime] = useState(timeString(-60))
  const [endTime, setEndTime] = useState(timeString())
  const [note, setNote] = useState("")
  const [rpe, setRpe] = useState(5)

  const filtered = ACTIVITY_TYPES.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelectType(type: string) {
    setSelectedType(type)
    setStep(2)
    setSearch("")
  }

  function handleSave() {
    startTransition(async () => {
      await logFreeActivity(selectedType, title, date, startTime, endTime, rpe, note)
      router.push("/activites")
    })
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pt-1">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-d5-muted hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white">Ajouter une activité</h1>
            <p className="text-d5-muted text-xs">Étape 1 de 2</p>
          </div>
        </div>

        <p className="font-semibold text-white">Sélectionner un type</p>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-d5-muted" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-d5-surface border border-d5-border rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-d5-muted focus:outline-none focus:border-d5-gold/50"
          />
        </div>

        <div className="card divide-y divide-d5-border p-0 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-d5-muted text-sm px-4 py-4">Aucun résultat</p>
          ) : (
            filtered.map((type) => (
              <button
                key={type}
                onClick={() => handleSelectType(type)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-d5-surface-2 transition-colors text-left"
              >
                <span className="text-white text-sm">{type}</span>
                {selectedType === type && <Check size={16} className="text-d5-gold" />}
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => setStep(1)}
          className="p-2 -ml-2 rounded-xl text-d5-muted hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Ajouter une activité</h1>
          <p className="text-d5-muted text-xs">Étape 2 de 2</p>
        </div>
      </div>

      {/* Selected type */}
      <div className="card flex items-center justify-between py-3">
        <span className="text-white font-semibold">{selectedType}</span>
        <button
          onClick={() => setStep(1)}
          className="text-d5-gold text-sm font-medium"
        >
          Modifier
        </button>
      </div>

      {/* Form */}
      <div className="card space-y-3">
        <input
          type="text"
          placeholder="Personnaliser le titre (optionnel)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-d5-surface-2 rounded-xl px-4 py-3 text-white text-sm placeholder:text-d5-muted focus:outline-none border border-transparent focus:border-d5-gold/50"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-d5-surface-2 rounded-xl px-4 py-3 text-white text-sm focus:outline-none border border-transparent focus:border-d5-gold/50"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-d5-muted text-xs mb-1.5 block">Début</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-d5-surface-2 rounded-xl px-4 py-3 text-white text-sm focus:outline-none border border-transparent focus:border-d5-gold/50"
            />
          </div>
          <div>
            <label className="text-d5-muted text-xs mb-1.5 block">Fin</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-d5-surface-2 rounded-xl px-4 py-3 text-white text-sm focus:outline-none border border-transparent focus:border-d5-gold/50"
            />
          </div>
        </div>
        <textarea
          placeholder="Note au coach (optionnel)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full bg-d5-surface-2 rounded-xl px-4 py-3 text-white text-sm placeholder:text-d5-muted focus:outline-none border border-transparent focus:border-d5-gold/50 resize-none"
        />
      </div>

      {/* RPE */}
      <div className="card space-y-3">
        <p className="font-semibold text-white">Perception de l&apos;effort</p>
        <div className="flex justify-between text-xs text-d5-muted">
          <span>Faible</span>
          <span>Maximal</span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          value={rpe}
          onChange={(e) => setRpe(Number(e.target.value))}
          className="w-full accent-d5-gold"
        />
        <div className="flex justify-between">
          {Array.from({ length: 11 }, (_, i) => (
            <span
              key={i}
              className={`text-[10px] font-medium transition-colors ${
                i === rpe ? "text-d5-gold" : "text-d5-muted"
              }`}
            >
              {i}
            </span>
          ))}
        </div>
        <p className="text-center text-sm text-white font-semibold">{RPE_LABELS[rpe]}</p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full py-4 rounded-2xl bg-d5-gold text-black font-bold text-base disabled:opacity-60 transition-opacity"
        >
          {isPending ? "Enregistrement..." : "Sauvegarder"}
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full py-3 rounded-2xl border border-d5-border text-d5-muted font-medium text-sm"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
