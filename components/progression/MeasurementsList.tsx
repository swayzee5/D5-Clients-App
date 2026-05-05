import { Scale, Ruler } from "lucide-react"
import type { ProgressEntry } from "@/lib/queries/progression"

function fmt(val: number | null, unit: string): string {
  if (val === null) return "—"
  return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)} ${unit}`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

function EntryCard({ entry, isLatest }: { entry: ProgressEntry; isLatest: boolean }) {
  const hasMeasurements = [
    entry.waistCm,
    entry.chestCm,
    entry.hipsCm,
    entry.armsCm,
    entry.thighsCm,
  ].some((v) => v !== null)

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLatest && (
            <span className="px-2 py-0.5 rounded-full bg-d5-gold/20 text-d5-gold text-[10px] font-bold uppercase tracking-wider">
              Actuel
            </span>
          )}
          <span className="text-d5-muted text-xs">{formatDate(entry.entryDate)}</span>
        </div>
      </div>

      {/* Weight */}
      {entry.weightKg !== null && (
        <div className="flex items-center gap-2">
          <Scale size={14} className="text-d5-muted flex-shrink-0" />
          <span className="text-d5-muted text-xs">Poids</span>
          <span className="text-white font-bold text-sm ml-auto">{fmt(entry.weightKg, "kg")}</span>
        </div>
      )}

      {/* Measurements grid */}
      {hasMeasurements && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-d5-border">
          {[
            { label: "Taille", value: entry.waistCm, unit: "cm" },
            { label: "Poitrine", value: entry.chestCm, unit: "cm" },
            { label: "Hanches", value: entry.hipsCm, unit: "cm" },
            { label: "Bras", value: entry.armsCm, unit: "cm" },
            { label: "Cuisses", value: entry.thighsCm, unit: "cm" },
          ]
            .filter((m) => m.value !== null)
            .map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-d5-muted text-xs">{m.label}</span>
                <span className="text-white text-xs font-semibold">{fmt(m.value, m.unit)}</span>
              </div>
            ))}
        </div>
      )}

      {entry.notes && (
        <p className="text-d5-muted text-xs italic border-t border-d5-border pt-2">{entry.notes}</p>
      )}
    </div>
  )
}

export function MeasurementsList({ entries }: { entries: ProgressEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="card text-center py-10">
        <Ruler size={28} className="text-d5-muted mx-auto mb-3" />
        <p className="text-white font-semibold text-sm">Aucune mesure enregistrée</p>
        <p className="text-d5-muted text-xs mt-1">Appuie sur + pour commencer le suivi</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <EntryCard key={entry.id} entry={entry} isLatest={i === 0} />
      ))}
    </div>
  )
}
