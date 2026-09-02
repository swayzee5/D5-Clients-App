"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"

/**
 * Écran de calcul du Reboot Score.
 *
 * Le score se calcule en quelques millisecondes ; cette attente est donc mise
 * en scène, et l'assumer est le point. Passer sans transition de la dernière
 * question à un chiffre donne l'impression d'un résultat sorti de nulle part.
 * Voir les étapes défiler donne au chiffre le poids de ce qu'il représente —
 * et laisse au participant le temps de se préparer à le recevoir.
 *
 * Les libellés décrivent ce qui se passe réellement : rien n'est inventé pour
 * faire patienter.
 */

const STEPS = [
  "Analyse de vos réponses",
  "Calcul de vos six axes",
  "Préparation de votre bilan",
]

const STEP_MS = 850

export function RebootBuildingScreen({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    // Respecte le réglage système « réduire les animations » : dans ce cas on
    // ne fait pas patienter du tout.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    if (reduced) {
      onDone()
      return
    }

    const timers = STEPS.map((_, i) =>
      setTimeout(() => setCurrent(i + 1), STEP_MS * (i + 1))
    )
    const end = setTimeout(onDone, STEP_MS * STEPS.length + 500)

    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(end)
    }
  }, [onDone])

  return (
    <div className="flex min-h-[60vh] flex-col justify-center space-y-8">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-d5-muted">
          Un instant
        </p>
        <h2 className="text-2xl font-black leading-tight text-white">
          Je construis votre Reboot Score
        </h2>
      </div>

      <div className="mx-auto w-full max-w-xs space-y-3">
        {STEPS.map((label, i) => {
          const done = current > i
          const active = current === i
          return (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-500 ${
                done || active ? "bg-d5-surface" : "bg-transparent"
              }`}
              style={{ opacity: done || active ? 1 : 0.35 }}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                {done ? (
                  <Check className="h-5 w-5 text-d5-gold" />
                ) : active ? (
                  <Loader2 className="h-5 w-5 animate-spin text-d5-gold" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-d5-border" />
                )}
              </span>
              <span
                className={`text-[15px] ${
                  done ? "text-white" : active ? "text-white" : "text-d5-muted"
                }`}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-d5-surface-2">
        <div
          className="h-full rounded-full bg-d5-gold transition-all ease-out"
          style={{
            width: `${(current / STEPS.length) * 100}%`,
            transitionDuration: `${STEP_MS}ms`,
          }}
        />
      </div>
    </div>
  )
}
