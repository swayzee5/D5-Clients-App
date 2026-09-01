"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Lock } from "lucide-react"
import { submitRebootDiagnostic } from "@/app/(dashboard)/reboot/diagnostic-actions"
import {
  QUESTIONS,
  SCORE_AXES,
  computeScores,
  missingAnswers,
  readScore,
  weakestAxis,
  type Answers,
  type Question,
  type ScoreKey,
  type Scores,
} from "@/lib/reboot-diagnostic"

/** Adresse affichée au participant s'il est bloqué sur le formulaire. */
const COACH_EMAIL = "d5fitnesstraining@gmail.com"

/**
 * Diagnostic de départ Reboot 40, bloquant.
 *
 * Une question par écran plutôt qu'un long formulaire : le public a 40-65 ans,
 * répond sur téléphone, et la moitié des questions sont du texte libre. Un mur
 * de champs ferait abandonner, et une réponse bâclée ne sert ni le score ni le
 * message vocal.
 *
 * Le composant est rendu à la place du tableau de bord, pas par-dessus : rien
 * d'autre n'est monté, donc rien d'autre n'est atteignable, même au clavier ou
 * au lecteur d'écran. C'est plus sûr qu'une surcouche qu'on peut contourner.
 */
export function RebootDiagnosticModal({ firstName }: { firstName?: string | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // -1 = écran d'accueil qui explique le blocage, puis une étape par question.
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState<Answers>({})
  const [touchedRatings, setTouchedRatings] = useState<Set<ScoreKey>>(new Set())
  const [scores, setScores] = useState<Scores | null>(null)
  const [error, setError] = useState<string | null>(null)

  const question: Question | undefined = QUESTIONS[step]
  const total = QUESTIONS.length

  const set = useCallback(<K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }, [])

  /** L'étape courante est-elle complète ? Conditionne le bouton « Continuer ». */
  const stepComplete = useMemo(() => {
    if (!question) return false
    if (question.kind === "ratings") {
      // Une note doit avoir été touchée, pas seulement avoir une valeur par
      // défaut : sans ça, un participant pressé validerait six « 5 » sans les
      // avoir regardés, et le score de départ ne voudrait plus rien dire.
      return SCORE_AXES.every(({ key }) => touchedRatings.has(key))
    }
    return missingAnswers({ ...answers } as Answers).indexOf(question.id) === -1
  }, [question, answers, touchedRatings])

  function next() {
    setError(null)
    if (step < total - 1) {
      setStep(step + 1)
      return
    }
    startTransition(async () => {
      const result = await submitRebootDiagnostic(answers)
      if (result.ok) {
        setScores(result.scores)
      } else {
        setError(result.error)
      }
    })
  }

  /* ---------------------------------------------------------------- écrans */

  if (scores) {
    return (
      <Shell>
        <ScoreResult
          scores={scores}
          onStart={() => {
            // Le layout relit la base au rendu suivant et laissera passer.
            router.refresh()
          }}
          pending={isPending}
        />
      </Shell>
    )
  }

  if (step === -1) {
    return (
      <Shell>
        <div className="space-y-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-d5-gold/15">
            <Lock className="h-6 w-6 text-d5-gold" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-black leading-tight text-white">
              {firstName ? `${firstName}, avant de commencer` : "Avant de commencer"}
            </h1>
            <p className="text-[15px] leading-relaxed text-d5-muted">
              Pour démarrer votre Reboot, j&apos;ai besoin de vous connaître un peu mieux.
              Ce diagnostic prend <span className="text-white">3 à 4 minutes</span> et il est
              nécessaire pour accéder au challenge — il n&apos;y a pas de raccourci, et c&apos;est
              volontaire.
            </p>
            <p className="text-[15px] leading-relaxed text-d5-muted">
              Vos réponses me servent à deux choses : vous enregistrer un{" "}
              <span className="text-white">message vocal personnel</span> avant le départ, et
              calculer votre <span className="text-white">Reboot Score</span>, votre point de
              comparaison à la fin des 7 jours.
            </p>
            <p className="text-[15px] leading-relaxed text-d5-muted">
              Répondez franchement. Personne d&apos;autre que moi ne lit ces réponses.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="w-full rounded-2xl bg-d5-gold px-6 py-4 text-base font-bold text-d5-bg transition-colors hover:bg-d5-gold-light"
          >
            Commencer le diagnostic
          </button>
        </div>
      </Shell>
    )
  }

  if (!question) return null

  return (
    <Shell>
      <div className="space-y-6">
        <Progress step={step} total={total} onBack={() => setStep(step - 1)} />

        <div className="space-y-2">
          <h2 className="text-xl font-black leading-snug text-white">{question.prompt}</h2>
          {question.help && (
            <p className="text-sm leading-relaxed text-d5-muted">{question.help}</p>
          )}
        </div>

        {question.kind === "text" && (
          <textarea
            autoFocus
            rows={5}
            placeholder={question.placeholder}
            value={(answers[question.id as "bascule"] as string) ?? ""}
            onChange={(e) => set(question.id as "bascule", e.target.value)}
            className="w-full rounded-2xl border border-transparent bg-d5-surface-2 px-4 py-3 text-base leading-relaxed text-white placeholder:text-d5-muted focus:border-d5-gold/50 focus:outline-none"
          />
        )}

        {question.kind === "percent" && (
          <BatterySlider
            value={answers.batterie}
            onChange={(v) => set("batterie", v)}
          />
        )}

        {question.kind === "single" && (
          <div className="space-y-3">
            {question.choices.map((choice) => {
              const selected = answers[question.id as "strategie_15h"] === choice.value
              return (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => set(question.id as "strategie_15h", choice.value)}
                  className={`w-full rounded-2xl border-2 px-5 py-4 text-left text-base transition-all ${
                    selected
                      ? "border-d5-gold bg-d5-gold/15 font-semibold text-white"
                      : "border-transparent bg-d5-surface-2 text-d5-text"
                  }`}
                >
                  {choice.label}
                </button>
              )
            })}
          </div>
        )}

        {question.kind === "yesno" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              {(["oui", "non"] as const).map((value) => {
                const selected = answers.entourage?.value === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      set("entourage", { value, detail: answers.entourage?.detail })
                    }
                    className={`flex-1 rounded-2xl border-2 px-5 py-4 text-base capitalize transition-all ${
                      selected
                        ? "border-d5-gold bg-d5-gold/15 font-semibold text-white"
                        : "border-transparent bg-d5-surface-2 text-d5-text"
                    }`}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
            {answers.entourage?.value && (
              <div className="space-y-2">
                <p className="text-sm text-d5-muted">{question.followUp.prompt}</p>
                <textarea
                  rows={3}
                  placeholder={question.followUp.placeholder}
                  value={answers.entourage.detail ?? ""}
                  onChange={(e) =>
                    set("entourage", {
                      value: answers.entourage!.value,
                      detail: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-transparent bg-d5-surface-2 px-4 py-3 text-base leading-relaxed text-white placeholder:text-d5-muted focus:border-d5-gold/50 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {question.kind === "ratings" && (
          <div className="space-y-5">
            {SCORE_AXES.map((axis) => (
              <RatingSlider
                key={axis.key}
                axis={axis}
                value={answers.notes?.[axis.key]}
                touched={touchedRatings.has(axis.key)}
                onChange={(v) => {
                  setAnswers((prev) => ({ ...prev, notes: { ...prev.notes, [axis.key]: v } }))
                  setTouchedRatings((prev) => new Set(prev).add(axis.key))
                }}
              />
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
        )}

        <button
          type="button"
          onClick={next}
          disabled={!stepComplete || isPending}
          className="w-full rounded-2xl bg-d5-gold px-6 py-4 text-base font-bold text-d5-bg transition-colors hover:bg-d5-gold-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending
            ? "Enregistrement…"
            : step === total - 1
              ? "Voir mon Reboot Score"
              : "Continuer"}
        </button>

        {!stepComplete && (
          <p className="text-center text-xs text-d5-muted">
            Répondez pour continuer — toutes les questions comptent.
          </p>
        )}
      </div>
    </Shell>
  )
}

/* ------------------------------------------------------------------ pièces */

/**
 * Cadre commun. Occupe tout l'écran, gère le scroll et les encoches, et porte
 * le lien de secours vers le coach : le formulaire étant bloquant, un
 * participant qui coince ne doit pas se retrouver sans issue.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-app overflow-y-auto bg-d5-bg">
      <div
        className="mx-auto max-w-lg px-5 pb-10"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
      >
        <p className="mb-6 text-sm font-black tracking-wide text-d5-gold">
          D5 <span className="font-medium text-d5-muted">| Reboot 40</span>
        </p>
        {children}
        <p className="mt-10 text-center text-xs text-d5-muted">
          Un problème ?{" "}
          <a
            href={`mailto:${COACH_EMAIL}?subject=Reboot%2040%20—%20diagnostic`}
            className="text-d5-gold underline underline-offset-2"
          >
            Écris à ton coach
          </a>
        </p>
      </div>
    </div>
  )
}

function Progress({
  step,
  total,
  onBack,
}: {
  step: number
  total: number
  onBack: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 rounded-xl p-2 text-d5-muted transition-colors hover:text-white"
          aria-label="Question précédente"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-xs font-medium text-d5-muted">
          Question {step + 1} sur {total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-d5-surface-2">
        <div
          className="h-full rounded-full bg-d5-gold transition-all duration-300"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

/** Curseur 0-100 %, présenté comme une batterie de téléphone. */
function BatterySlider({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (v: number) => void
}) {
  const current = value ?? 50
  return (
    <div className="space-y-4 rounded-2xl bg-d5-surface p-5">
      <div className="text-center">
        <span className="text-5xl font-black text-d5-gold">
          {value === undefined ? "—" : `${current}%`}
        </span>
      </div>
      <div className="h-6 overflow-hidden rounded-full border-2 border-d5-border bg-d5-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-d5-gold to-d5-gold-light transition-all"
          style={{ width: value === undefined ? "0%" : `${current}%` }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-d5-gold"
        aria-label="Niveau de batterie du matin"
      />
      <div className="flex justify-between text-xs text-d5-muted">
        <span>Vide</span>
        <span>Pleine</span>
      </div>
    </div>
  )
}

/** Une note de 1 à 10 pour un axe du Reboot Score. */
function RatingSlider({
  axis,
  value,
  touched,
  onChange,
}: {
  axis: (typeof SCORE_AXES)[number]
  value: number | undefined
  touched: boolean
  onChange: (v: number) => void
}) {
  const current = value ?? 5
  return (
    <div className="space-y-2 rounded-2xl bg-d5-surface p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-semibold text-white">
          {axis.emoji} {axis.label}
        </span>
        <span
          className={`text-2xl font-black ${touched ? "text-d5-gold" : "text-d5-muted"}`}
        >
          {touched ? current : "—"}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-d5-gold"
        aria-label={`${axis.label}, de 1 à 10`}
      />
      <div className="flex justify-between text-[11px] text-d5-muted">
        <span>{axis.low}</span>
        <span>{axis.high}</span>
      </div>
    </div>
  )
}

/** Écran final : le Reboot Score, global puis par axe. */
function ScoreResult({
  scores,
  onStart,
  pending,
}: {
  scores: Scores
  onStart: () => void
  pending: boolean
}) {
  const reading = readScore(scores.global)
  const weakest = weakestAxis(scores)

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-d5-muted">
          Votre Reboot Score de départ
        </p>
        <p className="text-7xl font-black leading-none text-d5-gold">{scores.global}</p>
        <p className="text-sm text-d5-muted">sur 100</p>
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
                className={`h-full rounded-full ${
                  axis.key === weakest.key ? "bg-d5-gold-light" : "bg-d5-gold/60"
                }`}
                style={{ width: `${scores[axis.key]}%` }}
              />
            </div>
          </div>
        ))}
        <p className="pt-1 text-sm leading-relaxed text-d5-muted">
          Votre point le plus bas : <span className="text-white">{weakest.label.toLowerCase()}</span>.
          C&apos;est par là qu&apos;on commencera.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-d5-border bg-d5-surface p-5">
        <p className="text-[15px] leading-relaxed text-d5-muted">
          J&apos;ai bien reçu vos réponses. Je vous prépare un message vocal personnel avant le
          départ du challenge — vous le recevrez dans votre messagerie.
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={pending}
        className="w-full rounded-2xl bg-d5-gold px-6 py-4 text-base font-bold text-d5-bg transition-colors hover:bg-d5-gold-light disabled:opacity-60"
      >
        Accéder à mon Reboot
      </button>
    </div>
  )
}

/* Réexporté pour les tests éventuels du barème sans monter le composant. */
export { computeScores }
