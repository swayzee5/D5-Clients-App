import { SCORE_AXES, readScore, weakestAxis, type Scores } from "@/lib/reboot-diagnostic"

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
}: {
  scores: Scores
  submittedAt?: Date | null
}) {
  const reading = readScore(scores.global)
  const weakest = weakestAxis(scores)

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-d5-muted">
          Votre Reboot Score de départ
        </p>
        <p className="text-7xl font-black leading-none text-d5-gold">{scores.global}</p>
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
                className={`h-full rounded-full ${
                  axis.key === weakest.key ? "bg-d5-gold-light" : "bg-d5-gold/60"
                }`}
                style={{ width: `${scores[axis.key]}%` }}
              />
            </div>
          </div>
        ))}
        <p className="pt-1 text-sm leading-relaxed text-d5-muted">
          Votre point le plus bas :{" "}
          <span className="text-white">{weakest.label.toLowerCase()}</span>. C&apos;est par là
          qu&apos;on commence.
        </p>
      </div>
    </div>
  )
}
