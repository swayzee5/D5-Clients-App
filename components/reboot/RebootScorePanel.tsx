"use client"

import { useEffect, useState } from "react"
import { SCORE_AXES, explainScore, readScore, type Scores } from "@/lib/reboot-diagnostic"

/**
 * Compte de 0 jusqu'à la valeur. Utilisé seulement à la découverte du score :
 * le chiffre qui monte prolonge l'écran de construction et évite qu'un nombre
 * apparaisse d'un coup, sans poids.
 */
function useCountUp(target: number, enabled: boolean, durationMs = 1100): number {
  const [value, setValue] = useState(enabled ? 0 : target)

  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      setValue(target)
      return
    }

    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs)
      // Ralentit en fin de course : le chiffre se pose au lieu de s'arrêter net.
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, enabled, durationMs])

  return value
}

/**
 * Le Reboot Score tel que le participant le voit.
 *
 * Partagé entre l'écran de fin du diagnostic et la page consultable ensuite :
 * le score doit se relire à l'identique des mois plus tard, et deux rendus
 * séparés auraient fini par diverger.
 */
export function RebootScorePanel({
  scores,
  submittedAt,
  animate = false,
}: {
  scores: Scores
  submittedAt?: Date | null
  /** Anime le chiffre et les barres. Réservé à la découverte du score. */
  animate?: boolean
}) {
  const reading = readScore(scores.global)
  const explanation = explainScore(scores)
  const weakest = explanation.priorities[0]
  const displayed = useCountUp(scores.global, animate)

  // Les barres partent de zéro puis se remplissent, une fois le premier rendu
  // passé. Sans ce délai, React peindrait directement la largeur finale.
  const [filled, setFilled] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setFilled(true), 60)
    return () => clearTimeout(t)
  }, [animate])

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-d5-muted">
          Votre Reboot Score de départ
        </p>
        <p className="text-7xl font-black leading-none text-d5-gold">{displayed}</p>
        <p className="text-sm text-d5-muted">
          sur 100
          {submittedAt && (
            <>
              {" · "}
              {new Date(submittedAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
              })}
            </>
          )}
        </p>
      </div>

      <div className="space-y-2 rounded-2xl bg-d5-surface p-5 text-center">
        <p className="text-lg font-black text-white">{reading.title}</p>
        <p className="text-[15px] leading-relaxed text-d5-muted">{reading.message}</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-white">Le détail</p>
        {SCORE_AXES.map((axis) => (
          <div key={axis.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-d5-text">
                {axis.emoji} {axis.label}
              </span>
              <span className="font-bold text-white">{scores[axis.key] / 10}/10</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-d5-surface-2">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                  axis.key === weakest.key ? "bg-d5-gold-light" : "bg-d5-gold/60"
                }`}
                style={{ width: `${filled ? scores[axis.key] : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl bg-d5-surface p-5">
        <p className="text-sm font-semibold text-white">Pourquoi ce score</p>
        <p className="text-[15px] leading-relaxed text-d5-muted">{explanation.summary}</p>
        {explanation.strength && (
          <p className="text-[15px] leading-relaxed text-d5-muted">
            Vous avez aussi un appui :{" "}
            <span className="text-white">
              {explanation.strength.label.toLowerCase()} ({explanation.strength.note}/10)
            </span>
            . On s&apos;en servira.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-white">Vos deux priorités</p>
        {explanation.priorities.map((p, i) => (
          <div key={p.key} className="space-y-2 rounded-2xl border border-d5-border bg-d5-surface p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold text-white">
                {i + 1}. {p.emoji} {p.label}
              </span>
              <span className="text-sm font-bold text-d5-gold">{p.note}/10</span>
            </div>
            <p className="text-sm leading-relaxed text-d5-muted">{p.why}</p>
            <p className="rounded-xl bg-d5-surface-2 px-3 py-2 text-sm leading-relaxed text-d5-text">
              <span className="font-semibold text-white">Sur les 7 jours :</span> {p.action}
            </p>
          </div>
        ))}
        <p className="text-xs leading-relaxed text-d5-muted">
          Deux axes seulement, volontairement. En traiter six à la fois, c&apos;est n&apos;en
          traiter aucun.
        </p>
      </div>
    </div>
  )
}
