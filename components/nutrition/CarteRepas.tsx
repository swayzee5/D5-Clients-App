import { Check, CheckCheck, Clock } from "lucide-react";
import { resumerAnalyse } from "@/lib/analyse-repas";
import type { Repas } from "@/lib/queries/journal-repas";

/**
 * Un repas dans le journal du client.
 *
 * Deux états seulement : envoyé, puis répondu. Le « vu par le coach » existe
 * en base et sert à la file de tri côté CRM, mais il n'est pas montré ici —
 * délibérément. Un accusé de lecture transforme chaque silence en négligence
 * affichée : un repas marqué vu et resté sans réponse pendant trois jours se
 * remarque bien plus qu'un repas simplement en attente. La promesse serait
 * plus coûteuse que le confort qu'elle apporte.
 *
 * L'analyse automatique est présentée pour ce qu'elle est — une lecture de
 * l'image — et jamais comme la parole du coach. Les deux sont visuellement
 * séparées : confondre les deux ferait porter à Daye des phrases qu'il n'a pas
 * écrites.
 */

export function CarteRepas({ repas }: { repas: Repas }) {
  const repondu = repas.statut === "repondu";
  const label = repondu ? "Répondu" : "Envoyé";
  const Icone = repondu ? CheckCheck : Check;
  const couleur = repondu ? "text-green-400" : "text-d5-muted";

  return (
    <article className="card space-y-3">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/repas/photo/${repas.id}`}
          alt="Repas"
          loading="lazy"
          className="h-20 w-20 shrink-0 rounded-xl bg-d5-surface-2 object-cover"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-d5-muted">{quand(repas.createdAt)}</span>
            <span className={`flex items-center gap-1 text-xs font-medium ${couleur}`}>
              <Icone size={13} />
              {label}
            </span>
          </div>

          {repas.analyse ? (
            <>
              <p className="text-sm font-medium leading-snug text-white">
                {repas.analyse.aliments.length > 0
                  ? repas.analyse.aliments.join(", ")
                  : "Assiette non identifiée"}
              </p>
              <p className="text-xs text-d5-muted">{resumerAnalyse(repas.analyse)}</p>
            </>
          ) : (
            <p className="text-sm text-d5-muted">
              Photo envoyée à ton coach.
            </p>
          )}
        </div>
      </div>

      {repas.noteClient && (
        <p className="border-l-2 border-d5-border pl-3 text-xs italic leading-relaxed text-d5-muted">
          {repas.noteClient}
        </p>
      )}

      {repas.analyse?.incertitude && (
        <p className="text-xs leading-relaxed text-d5-muted">
          ⚠️ {repas.analyse.incertitude}
        </p>
      )}

      {repas.coachReply ? (
        <div className="rounded-xl border border-d5-gold/25 bg-d5-gold/5 p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-d5-gold">
            Daye
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-white">
            {repas.coachReply}
          </p>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-d5-muted">
          <Clock size={12} />
          Daye te répond dès qu&apos;il passe sur tes repas.
        </p>
      )}
    </article>
  );
}

/** « Il y a 2 h », « hier », puis la date. Plus lisible qu'un horodatage. */
function quand(date: Date): string {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  if (heures < 48) return "hier";
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
