"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  SCORE_AXES,
  comparer,
  type Evolution,
  type Ratings,
  type ScoreKey,
  type Scores,
} from "@/lib/reboot-diagnostic";
import { submitBilan } from "@/app/(dashboard)/reboot/bilan-actions";
import { messageInvitation } from "@/lib/invitation";

/**
 * Bilan de fin de challenge.
 *
 * Trois écrans, dans cet ordre précis :
 *
 *   1. Les six mêmes notes qu'au départ.
 *   2. L'écart, axe par axe. C'est le seul moment du parcours où la personne
 *      voit noir sur blanc ce qui a changé en sept jours.
 *   3. La satisfaction et le témoignage, demandés APRÈS l'écart.
 *
 * L'ordre n'est pas cosmétique. Demander un témoignage avant d'avoir montré la
 * progression, c'est demander à quelqu'un de recommander un ressenti flou.
 * Après, il raconte ce qu'il vient de constater.
 */

type Phase = "notes" | "resultat" | "avis" | "merci";

export function BilanForm({
  depart,
  firstName,
}: {
  depart: Scores;
  firstName?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [phase, setPhase] = useState<Phase>("notes");
  const [notes, setNotes] = useState<Partial<Ratings>>({});
  const [touchees, setTouchees] = useState<Set<ScoreKey>>(new Set());
  const [arrivee, setArrivee] = useState<Scores | null>(null);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [temoignage, setTemoignage] = useState("");
  const [publiable, setPubliable] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Toucher le curseur suffit à retenir la valeur affichée.
   *
   * Même raison qu'au diagnostic : qui pense déjà « 5 » n'a rien à déplacer,
   * donc onChange ne se déclenche jamais et il reste bloqué sans comprendre.
   */
  const marquer = useCallback((key: ScoreKey) => {
    setNotes((prev) => ({ ...prev, [key]: prev[key] ?? 5 }));
    setTouchees((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, []);

  const toutesNotees = SCORE_AXES.every(({ key }) => touchees.has(key));

  function envoyer(avecAvis: boolean) {
    setErreur(null);
    startTransition(async () => {
      const r = await submitBilan(
        notes,
        avecAvis ? satisfaction : null,
        avecAvis ? temoignage : "",
        avecAvis ? publiable : false
      );
      if (!r.ok) {
        setErreur(r.error);
        return;
      }
      setArrivee(r.scores);
      setPhase(avecAvis ? "merci" : "resultat");
    });
  }

  if (phase === "notes") {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-white">
            {firstName ? `${firstName}, où en es-tu ?` : "Où en es-tu ?"}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-d5-muted">
            Les six mêmes questions qu&apos;au premier jour. Réponds sans aller rechercher
            tes anciennes notes : on les compare juste après.
          </p>
        </div>

        {SCORE_AXES.map((axis) => (
          <RatingSlider
            key={axis.key}
            axis={axis}
            value={notes[axis.key]}
            touched={touchees.has(axis.key)}
            onChange={(v) => {
              setNotes((prev) => ({ ...prev, [axis.key]: v }));
              marquer(axis.key);
            }}
            onTouch={() => marquer(axis.key)}
          />
        ))}

        {erreur && <p className="text-sm text-red-400">{erreur}</p>}

        <button
          onClick={() => envoyer(false)}
          disabled={!toutesNotees || isPending}
          className={`w-full rounded-xl py-4 text-sm font-bold transition-all ${
            toutesNotees ? "bg-d5-gold text-black active:scale-[0.98]" : "bg-d5-surface-2 text-d5-muted"
          }`}
        >
          {isPending ? "Un instant…" : toutesNotees ? "Voir ma progression" : "Touche les six curseurs"}
        </button>

        {!toutesNotees && (
          <p className="text-center text-xs text-d5-muted">
            Il reste à renseigner :{" "}
            {SCORE_AXES.filter(({ key }) => !touchees.has(key))
              .map((a) => a.label.toLowerCase())
              .join(", ")}
          </p>
        )}
      </div>
    );
  }

  const evolutions = arrivee ? comparer(depart, arrivee) : [];
  const ecartGlobal = arrivee ? arrivee.global - depart.global : 0;
  const partage = messageInvitation(firstName, ecartGlobal > 0 ? ecartGlobal : null);

  if (phase === "resultat" && arrivee) {
    return (
      <div className="space-y-5">
        <Comparaison depart={depart} arrivee={arrivee} ecart={ecartGlobal} evolutions={evolutions} />
        <button
          onClick={() => setPhase("avis")}
          className="w-full rounded-xl bg-d5-gold py-4 text-sm font-bold text-black active:scale-[0.98]"
        >
          Continuer
        </button>
      </div>
    );
  }

  if (phase === "avis") {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white">Ton avis sur la semaine</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-d5-muted">
            Deux questions, et c&apos;est terminé.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-d5-muted">
            Tu recommanderais ce challenge ?
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setSatisfaction(n)}
                className={`flex-1 rounded-xl border py-3 text-sm font-bold transition-all ${
                  satisfaction === n
                    ? "border-d5-gold bg-d5-gold/10 text-white"
                    : "border-d5-border bg-d5-surface-2 text-d5-muted"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-d5-muted">
            <span>Pas du tout</span>
            <span>Sans hésiter</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-d5-muted">
            En une phrase, qu&apos;est-ce qui a changé ?
          </p>
          <textarea
            value={temoignage}
            onChange={(e) => setTemoignage(e.target.value)}
            rows={3}
            placeholder="ex : je me réveille sans l'impression d'avoir couru la nuit…"
            className="w-full resize-none rounded-xl border border-d5-border bg-d5-surface-2 px-3 py-2.5 text-sm text-white placeholder-d5-muted focus:border-d5-gold/40 focus:outline-none"
          />
          {/* L'autorisation est demandée au moment où la phrase est écrite.
              Revenir la chercher plus tard est bien plus difficile, et publier
              sans l'avoir demandée n'est pas une option. */}
          {temoignage.trim().length > 0 && (
            <label className="flex items-start gap-2.5 rounded-xl bg-d5-surface-2 p-3">
              <input
                type="checkbox"
                checked={publiable}
                onChange={(e) => setPubliable(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-d5-gold"
              />
              <span className="text-xs leading-relaxed text-d5-muted">
                J&apos;autorise Daye à utiliser cette phrase publiquement, avec mon prénom.
              </span>
            </label>
          )}
        </div>

        {erreur && <p className="text-sm text-red-400">{erreur}</p>}

        <button
          onClick={() => envoyer(true)}
          disabled={isPending || satisfaction === null}
          className="w-full rounded-xl bg-d5-gold py-4 text-sm font-bold text-black active:scale-[0.98] disabled:opacity-60"
        >
          {isPending ? "Enregistrement…" : "Terminer"}
        </button>
      </div>
    );
  }

  // Merci : la progression reste à l'écran, et le partage n'est proposé qu'à
  // ceux qui viennent de dire du bien. Demander à un déçu de recruter ses
  // proches, c'est perdre les deux.
  return (
    <div className="space-y-5">
      {arrivee && (
        <Comparaison depart={depart} arrivee={arrivee} ecart={ecartGlobal} evolutions={evolutions} />
      )}

      {(satisfaction ?? 0) >= 4 ? (
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-white">Un gars autour de toi en a besoin</p>
          <p className="text-xs leading-relaxed text-d5-muted">
            Tu connais forcément un collègue, un frère ou un pote qui dit
            « il faudrait que je m&apos;y remette » depuis des mois. Envoie-lui ça.
          </p>
          <div className="rounded-xl border border-d5-gold/20 bg-d5-surface-2 p-3.5">
            <p className="whitespace-pre-line text-sm leading-relaxed text-white">{partage}</p>
          </div>
          <button
            onClick={async () => {
              // Partage natif d'abord : il ouvre la liste des contacts et
              // laisse choisir WhatsApp ou SMS en un geste. Sinon, copie.
              if (typeof navigator !== "undefined" && navigator.share) {
                try {
                  await navigator.share({ text: partage });
                  return;
                } catch {
                  // Annulé : la copie prend le relais.
                }
              }
              try {
                await navigator.clipboard.writeText(partage);
              } catch {
                // Presse-papier refusé : le texte reste sélectionnable.
              }
            }}
            className="w-full rounded-xl border border-d5-border bg-d5-surface-2 py-3 text-sm font-medium text-white"
          >
            Envoyer le message
          </button>
        </div>
      ) : (
        <div className="card space-y-2">
          <p className="text-sm font-semibold text-white">Qu&apos;est-ce qui a manqué ?</p>
          <p className="text-xs leading-relaxed text-d5-muted">
            Réponds-moi directement dans la messagerie. C&apos;est ce qui me permet
            d&apos;améliorer le prochain.
          </p>
        </div>
      )}

      <button
        onClick={() => { router.push("/reboot"); router.refresh(); }}
        className="w-full rounded-xl bg-d5-gold py-4 text-sm font-bold text-black active:scale-[0.98]"
      >
        Retour au challenge
      </button>
    </div>
  );
}

function Comparaison({
  depart,
  arrivee,
  ecart,
  evolutions,
}: {
  depart: Scores;
  arrivee: Scores;
  ecart: number;
  evolutions: Evolution[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-d5-gold/30 bg-gradient-to-br from-d5-gold/15 to-transparent p-5 text-center">
        <p className="text-xs uppercase tracking-wider text-d5-muted">Ton Reboot Score</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div>
            <p className="text-3xl font-black text-d5-muted">{depart.global}</p>
            <p className="text-[11px] text-d5-muted">au départ</p>
          </div>
          <span className="text-2xl text-d5-muted">→</span>
          <div>
            <p className="text-4xl font-black text-d5-gold">{arrivee.global}</p>
            <p className="text-[11px] text-d5-muted">aujourd&apos;hui</p>
          </div>
        </div>
        <p className={`mt-3 text-sm font-bold ${ecart > 0 ? "text-green-400" : "text-d5-muted"}`}>
          {ecart > 0
            ? `+${ecart} points en 7 jours`
            : ecart === 0
              ? "Score stable"
              : `${ecart} points`}
        </p>
      </div>

      <div className="card space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-d5-gold">Axe par axe</p>
        {evolutions.map((e) => (
          <div key={e.axe} className="flex items-center gap-3">
            <span className="text-base">{e.emoji}</span>
            <span className="flex-1 text-sm text-gray-300">{e.axe}</span>
            <span className="text-xs text-d5-muted">
              {e.depart} → {e.arrivee}
            </span>
            <span
              className={`w-10 text-right text-sm font-bold ${
                e.ecart > 0 ? "text-green-400" : e.ecart < 0 ? "text-orange-400" : "text-d5-muted"
              }`}
            >
              {e.ecart > 0 ? `+${e.ecart}` : e.ecart}
            </span>
          </div>
        ))}
      </div>

      {/* Un score qui baisse n'est pas un échec du participant : sept jours
          suffisent rarement à changer un sommeil, et une semaine chargée
          déforme n'importe quelle note. Le dire évite que quelqu'un conclue
          qu'il a raté. */}
      {ecart <= 0 && (
        <p className="text-xs leading-relaxed text-d5-muted">
          Sept jours, c&apos;est court, et une semaine difficile suffit à faire baisser une
          note. Ce qui compte, c&apos;est que tu as tenu les dix étapes. Ton coach revient
          vers toi.
        </p>
      )}
    </div>
  );
}

function RatingSlider({
  axis,
  value,
  touched,
  onChange,
  onTouch,
}: {
  axis: (typeof SCORE_AXES)[number];
  value: number | undefined;
  touched: boolean;
  onChange: (v: number) => void;
  onTouch: () => void;
}) {
  const current = value ?? 5;
  return (
    <div className={`space-y-2 rounded-2xl bg-d5-surface p-4 ${touched ? "" : "ring-1 ring-d5-gold/40"}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-semibold text-white">
          {axis.emoji} {axis.label}
        </span>
        {touched ? (
          <span className="text-2xl font-black text-d5-gold">{current}</span>
        ) : (
          <span className="text-xs font-semibold text-d5-gold">à renseigner</span>
        )}
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={onTouch}
        onKeyDown={onTouch}
        className="w-full accent-d5-gold"
        aria-label={`${axis.label}, de 1 à 10`}
      />
      <div className="flex justify-between text-[11px] text-d5-muted">
        <span>{axis.low}</span>
        <span>{axis.high}</span>
      </div>
    </div>
  );
}
