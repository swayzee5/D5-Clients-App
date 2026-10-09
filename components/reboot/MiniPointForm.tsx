"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitMiniPoint } from "@/app/(dashboard)/reboot/point/actions";

/**
 * Le mini-point du mercredi.
 *
 * Trois questions, deux minutes. Son but est de faire remonter ce qui coince
 * pendant qu'il est encore temps : un participant qui décroche le mercredi se
 * rattrape, le même découvert au bilan du dimanche ne se rattrape plus.
 *
 * La première question dépend de ce qui est déjà enregistré. Demander « as-tu
 * fait ta première séance ? » à quelqu'un qui en a validé deux dans l'app lui
 * apprend surtout que personne ne regarde ce qu'il fait.
 */
export function MiniPointForm({
  firstName,
  seancesValidees,
}: {
  firstName?: string | null;
  seancesValidees: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Déjà des séances enregistrées : la question ne se pose plus, elle devient
  // une confirmation implicite.
  const [seanceFaite, setSeanceFaite] = useState<boolean | null>(
    seancesValidees > 0 ? true : null
  );
  const [frein, setFrein] = useState("");
  const [besoinAide, setBesoinAide] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  function envoyer() {
    setErreur(null);
    startTransition(async () => {
      const r = await submitMiniPoint({
        seanceFaite: seanceFaite === true,
        frein,
        besoinAide,
      });
      if (!r.ok) {
        setErreur(r.error ?? "Erreur");
        return;
      }
      router.push("/reboot");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">
          {firstName ? `${firstName}, où en es-tu ?` : "Où en es-tu ?"}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-d5-muted">
          Deux minutes, à mi-parcours. C&apos;est ce qui me permet de débloquer les choses
          avant la fin de la semaine.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-d5-muted">
          Ta première séance
        </p>
        {seancesValidees > 0 ? (
          <p className="rounded-xl bg-green-500/5 px-4 py-3 text-sm text-gray-300">
            Tu as déjà validé {seancesValidees} séance{seancesValidees > 1 ? "s" : ""}. Rien à
            confirmer.
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              {[
                { valeur: true, label: "Oui, je l'ai faite" },
                { valeur: false, label: "Pas encore" },
              ].map(({ valeur, label }) => (
                <button
                  key={label}
                  onClick={() => setSeanceFaite(valeur)}
                  className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-all ${
                    seanceFaite === valeur
                      ? "border-d5-gold bg-d5-gold/10 text-white"
                      : "border-d5-border bg-d5-surface-2 text-d5-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Une séance faite sans l'avoir cochée dans l'app reste une séance
                faite. Le nier obligerait le participant à mentir, ou à se
                sentir en retard alors qu'il ne l'est pas. */}
            {seanceFaite === true && (
              <p className="text-xs leading-relaxed text-d5-muted">
                Pense à la valider dans l&apos;app pour qu&apos;elle compte dans tes 10 étapes.
              </p>
            )}
          </>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-d5-muted">
          Qu&apos;est-ce qui te freine ?
        </p>
        <textarea
          value={frein}
          onChange={(e) => setFrein(e.target.value)}
          rows={3}
          placeholder="ex : je n'arrive pas à caler les séances, j'ai mal au genou…"
          className="w-full resize-none rounded-xl border border-d5-border bg-d5-surface-2 px-3 py-2.5 text-sm text-white placeholder-d5-muted focus:border-d5-gold/40 focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-d5-muted">
          Tu as besoin de quelque chose de ma part ?
        </p>
        <textarea
          value={besoinAide}
          onChange={(e) => setBesoinAide(e.target.value)}
          rows={2}
          placeholder="Une adaptation, une question, un exercice à remplacer…"
          className="w-full resize-none rounded-xl border border-d5-border bg-d5-surface-2 px-3 py-2.5 text-sm text-white placeholder-d5-muted focus:border-d5-gold/40 focus:outline-none"
        />
      </div>

      {erreur && <p className="text-sm text-red-400">{erreur}</p>}

      <button
        onClick={envoyer}
        disabled={isPending || seanceFaite === null}
        className="w-full rounded-xl bg-d5-gold py-4 text-sm font-bold text-black transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {isPending ? "Envoi…" : "Envoyer mon point"}
      </button>
    </div>
  );
}
