import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Zap, Lock } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reboot 40+",
}

const DAYS = [
  { day: 1, title: "Jour 1 — Évaluation & Fondations", locked: false },
  { day: 2, title: "Jour 2 — Activation métabolique", locked: true },
  { day: 3, title: "Jour 3 — Force & Mobilité", locked: true },
  { day: 4, title: "Jour 4 — Nutrition anti-inflammation", locked: true },
  { day: 5, title: "Jour 5 — Récupération active", locked: true },
  { day: 6, title: "Jour 6 — Intensité progressive", locked: true },
  { day: 7, title: "Jour 7 — Bilan & Prochaines étapes", locked: true },
]

export default async function RebootPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-d5-gold/20 to-transparent border border-d5-gold/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-d5-gold" />
          <span className="text-d5-gold text-xs font-semibold uppercase tracking-wider">
            Programme offert
          </span>
        </div>
        <h1 className="text-xl font-bold text-white">Reboot 40+</h1>
        <p className="text-gray-400 text-sm mt-1.5">
          7 jours pour relancer ta machine. Un challenge conçu pour les hommes de 40+ qui veulent
          retrouver énergie, force et confiance.
        </p>
      </div>

      {/* Days list */}
      <div className="space-y-3">
        {DAYS.map(({ day, title, locked }) => (
          <div
            key={day}
            className={`card flex items-center gap-4 ${
              locked ? "opacity-50" : "hover:border-d5-gold/40 transition-colors cursor-pointer"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                locked ? "bg-d5-surface-2" : "bg-d5-gold/20"
              }`}
            >
              {locked ? (
                <Lock size={16} className="text-d5-muted" />
              ) : (
                <span className="text-d5-gold font-bold text-sm">{day}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${locked ? "text-d5-muted" : "text-white"}`}>
                {title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA after challenge */}
      <div className="card border-d5-gold/20 bg-gradient-to-br from-d5-gold/5 to-transparent">
        <p className="text-xs text-d5-gold font-semibold uppercase tracking-wider mb-2">
          Au terme du challenge
        </p>
        <p className="text-white font-semibold text-sm">
          Prêt à passer à la vitesse supérieure ?
        </p>
        <p className="text-d5-muted text-xs mt-1">
          Découvre le coaching individuel D5 et transforme durablement ton corps et ta santé.
        </p>
      </div>
    </div>
  )
}
