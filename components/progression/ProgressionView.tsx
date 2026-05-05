"use client"

import { useState } from "react"
import { WeightChart } from "./WeightChart"
import { MeasurementsList } from "./MeasurementsList"
import { cn } from "@/lib/utils"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import type { ProgressEntry } from "@/lib/queries/progression"

const TABS = [
  { id: "mesures", label: "Mesures" },
  { id: "graphiques", label: "Graphiques" },
]

function WeightDelta({ entries }: { entries: ProgressEntry[] }) {
  const withWeight = entries.filter((e) => e.weightKg !== null)
  if (withWeight.length < 2) return null

  const latest = withWeight[0].weightKg!
  const previous = withWeight[1].weightKg!
  const delta = latest - previous
  const sign = delta > 0 ? "+" : ""

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-semibold",
        delta < 0 ? "text-emerald-400" : delta > 0 ? "text-red-400" : "text-d5-muted"
      )}
    >
      {delta < 0 ? (
        <TrendingDown size={14} />
      ) : delta > 0 ? (
        <TrendingUp size={14} />
      ) : (
        <Minus size={14} />
      )}
      {sign}{delta.toFixed(1)} kg
    </span>
  )
}

export function ProgressionView({ entries }: { entries: ProgressEntry[] }) {
  const [activeTab, setActiveTab] = useState("mesures")

  const latest = entries[0] ?? null

  const weightChartData = [...entries]
    .filter((e) => e.weightKg !== null)
    .reverse()
    .map((e) => ({
      date: new Intl.DateTimeFormat("fr-FR", {
        month: "2-digit",
        year: "2-digit",
      }).format(new Date(e.entryDate)),
      weight: e.weightKg!,
    }))

  return (
    <div className="space-y-4">
      {/* Current weight hero */}
      {latest?.weightKg ? (
        <div className="card">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-d5-muted font-semibold uppercase tracking-wider">Poids actuel</p>
              <p className="text-4xl font-black text-white mt-1">
                {latest.weightKg.toFixed(1)}
                <span className="text-xl font-normal text-d5-muted ml-1">kg</span>
              </p>
            </div>
            <WeightDelta entries={entries} />
          </div>
          <p className="text-d5-muted text-xs mt-2">
            Mis à jour le{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              day: "numeric",
              month: "long",
            }).format(new Date(latest.entryDate))}
          </p>
        </div>
      ) : (
        entries.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-white font-semibold">Aucune mesure pour l&apos;instant</p>
            <p className="text-d5-muted text-sm mt-1">
              Appuie sur <span className="text-d5-gold font-bold">+</span> pour enregistrer ta première mesure
            </p>
          </div>
        )
      )}

      {/* Tab switcher */}
      {entries.length > 0 && (
        <>
          <div className="flex rounded-xl bg-d5-surface border border-d5-border p-1 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  activeTab === tab.id
                    ? "bg-d5-gold text-black"
                    : "text-d5-muted hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "mesures" && <MeasurementsList entries={entries} />}
          {activeTab === "graphiques" && (
            <div className="space-y-4">
              <p className="text-xs text-d5-muted font-semibold uppercase tracking-wider">Général</p>
              {weightChartData.length > 0 ? (
                <div className="card">
                  <p className="text-d5-gold text-xs font-semibold uppercase tracking-wider mb-1">Poids</p>
                  <p className="text-2xl font-black text-white mb-4">
                    {latest?.weightKg?.toFixed(2)}{" "}
                    <span className="text-sm font-normal text-d5-muted">kg</span>
                  </p>
                  <WeightChart data={weightChartData} />
                </div>
              ) : (
                <div className="card text-center py-8">
                  <p className="text-d5-muted text-sm">Pas assez de données pour afficher un graphique</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
