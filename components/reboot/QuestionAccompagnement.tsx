"use client";

import { useState, useTransition } from "react";
import { repondreIntention } from "@/app/(dashboard)/reboot/fin-actions";
import type { Intention } from "@/lib/queries/reboot-fin";

/**
 * La question qui suit la vidéo de clôture.
 *
 * Elle remplace un bouton « prendre rendez-vous » posé seul après dix minutes
 * de vidéo. Ce bouton demandait une décision franche à des gens qui sont,
 * pour la plupart, entre les deux : dire oui signifie dans leur tête un
 * engagement de plusieurs milliers d'euros, et faute de troisième voie ils
 * choisissaient le non — ou ne touchaient rien du tout.
 *
 * « J'hésite » mène au même rendez-vous sans rien engager, ce qui est
 * exactement ce que la vidéo promet. C'est la réponse attendue pour la
 * majorité, et elle est écrite pour être choisie sans gêne.
 *
 * Le choix s'enregistre au premier appui, avant même la question ouverte :
 * c'est l'information qui compte, et beaucoup abandonneront devant un champ
 * de texte. Mieux vaut une réponse sans commentaire qu'un formulaire complet
 * jamais envoyé.
 *
 * Un « non » n'est pas une porte fermée : la ligne pour revenir dessus reste
 * visible, parce qu'un avis change entre le dimanche soir et le mardi.
 */

const CHOIX: { valeur: Intention; titre: string; detail: string }[] = [
  {
    valeur: "oui",
    titre: "Oui, je veux en parler",
    detail: "On fixe un appel de 30 minutes",
  },
  {
    valeur: "hesite",
    titre: "J'hésite, j'aimerais en discuter avant de décider",
    detail: "L'appel n'engage à rien — c'est fait pour ça",
  },
  {
    valeur: "non",
    titre: "Non, pas pour le moment",
    detail: "Dis-moi quand même pourquoi, ça m'aide",
  },
];

export function QuestionAccompagnement({
  intentionInitiale,
  texteInitial,
  onReponse,
}: {
  intentionInitiale: Intention | null;
  texteInitial: string | null;
  /** Prévient l'écran parent, qui décide d'afficher le bouton de rendez-vous. */
  onReponse: (intention: Intention | null) => void;
}) {
  const [intention, setIntention] = useState<Intention | null>(intentionInitiale);
  const [texte, setTexte] = useState(texteInitial ?? "");
  const [texteEnvoye, setTexteEnvoye] = useState(Boolean(texteInitial));
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function choisir(valeur: Intention) {
    setErreur(null);
    setIntention(valeur);
    onReponse(valeur);
    startTransition(async () => {
      const r = await repondreIntention(valeur, texte);
      if (!r.ok) {
        // La réponse n'est pas enregistrée : on ne la laisse pas affichée
        // comme si elle l'était.
        setIntention(intentionInitiale);
        onReponse(intentionInitiale);
        setErreur(r.erreur ?? "Enregistrement impossible.");
        return;
      }
      setConfirmation("Réponse enregistrée");
      setTimeout(() => setConfirmation(null), 4000);
    });
  }

  function envoyerTexte() {
    if (!intention) return;
    setErreur(null);
    startTransition(async () => {
      const r = await repondreIntention(intention, texte);
      if (!r.ok) {
        setErreur(r.erreur ?? "Enregistrement impossible.");
        return;
      }
      setTexteEnvoye(true);
      setConfirmation("Merci, c'est noté");
      setTimeout(() => setConfirmation(null), 4000);
    });
  }

  const questionOuverte =
    intention === "non"
      ? "Qu'est-ce qui te freine ? Le prix, le moment, autre chose ?"
      : "Qu'est-ce que tu voudrais changer en priorité ?";

  return (
    <div className="space-y-4 rounded-2xl border border-d5-border bg-d5-surface p-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-d5-gold">
          Une dernière question
        </p>
        <p className="mt-1.5 text-sm font-semibold leading-relaxed text-white">
          Souhaites-tu être accompagné sur les six prochains mois ?
        </p>
      </div>

      <div className="space-y-2">
        {CHOIX.map(({ valeur, titre, detail }) => {
          const choisi = intention === valeur;
          return (
            <button
              key={valeur}
              type="button"
              onClick={() => choisir(valeur)}
              disabled={isPending}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
                choisi
                  ? "border-d5-gold/60 bg-d5-gold/10"
                  : "border-d5-border bg-d5-surface-2 hover:border-d5-gold/30"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  choisi ? "border-d5-gold bg-d5-gold" : "border-d5-muted"
                }`}
              >
                {choisi && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">{titre}</span>
                <span className="mt-0.5 block text-xs text-d5-muted">{detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      {intention && (
        <div className="space-y-2 border-t border-d5-border pt-4">
          <label className="block text-sm text-gray-300" htmlFor="intention-texte">
            {questionOuverte}
          </label>
          <textarea
            id="intention-texte"
            value={texte}
            onChange={(e) => {
              setTexte(e.target.value);
              setTexteEnvoye(false);
            }}
            rows={3}
            placeholder="Deux lignes suffisent."
            className="w-full rounded-xl border border-d5-border bg-d5-surface-2 px-3 py-2 text-sm text-white placeholder:text-d5-muted focus:border-d5-gold/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={envoyerTexte}
            disabled={isPending || !texte.trim() || texteEnvoye}
            className="rounded-xl bg-d5-surface-2 px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            {isPending ? "Envoi…" : texteEnvoye ? "✓ Envoyé" : "Envoyer"}
          </button>
        </div>
      )}

      {/* Le succès s'efface, l'erreur reste : il y a quelque chose à refaire. */}
      {confirmation && <p className="text-xs font-medium text-green-400">✓ {confirmation}</p>}
      {erreur && <p className="text-xs font-medium text-red-400">{erreur}</p>}
    </div>
  );
}
