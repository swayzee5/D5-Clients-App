"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  reponsesManquantes,
  type QuestionNutrition,
  type ReponsesNutrition,
} from "@/lib/nutrition-suivi";
import { envoyerSuiviNutrition } from "@/app/(dashboard)/nutrition/profil/actions";

/**
 * Le questionnaire nutritionnel, une question par écran.
 *
 * Même parti pris que le diagnostic Reboot, et pour la même raison : le public
 * répond sur téléphone, et plusieurs questions sont du texte libre. Un mur de
 * champs fait abandonner, et une réponse bâclée ne sert ni le plan ni le
 * coach.
 *
 * On ne peut pas avancer sans répondre. Un questionnaire à trous produit un
 * plan à trous, et c'est le coach qui découvre l'absence au moment où il
 * écrit.
 */
export function QuestionnaireNutrition({
  questions,
  type,
  titre,
  introduction,
}: {
  questions: QuestionNutrition[];
  type: "depart" | "point";
  titre: string;
  introduction: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [index, setIndex] = useState(-1);
  const [reponses, setReponses] = useState<ReponsesNutrition>({});
  const [erreur, setErreur] = useState<string | null>(null);

  const question = index >= 0 ? questions[index] : null;
  const dernier = index === questions.length - 1;

  function repondre(valeur: string | number) {
    if (!question) return;
    setReponses((prev) => ({ ...prev, [question.id]: valeur }));
  }

  function suivant() {
    if (!dernier) {
      setIndex(index + 1);
      return;
    }
    const manquantes = reponsesManquantes(questions, reponses);
    if (manquantes.length > 0) {
      // Ne jamais laisser partir un questionnaire à trous : on ramène à la
      // première question sans réponse plutôt que d'afficher une liste
      // d'identifiants que personne ne peut relier à une question.
      setIndex(questions.findIndex((q) => q.id === manquantes[0]));
      setErreur("Il manque une réponse ici.");
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const r = await envoyerSuiviNutrition({ type, reponses });
      if (!r.ok) {
        setErreur(r.erreur);
        return;
      }
      router.push("/nutrition");
      router.refresh();
    });
  }

  if (!question) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white">{titre}</h1>
          <p className="mt-2 text-sm leading-relaxed text-d5-muted">{introduction}</p>
        </div>
        <p className="text-xs leading-relaxed text-d5-muted">
          {questions.length} questions, deux minutes. Tes réponses ne servent qu&apos;à adapter
          mes conseils — elles ne remplacent pas un avis médical.
        </p>
        <button
          onClick={() => setIndex(0)}
          className="w-full rounded-xl bg-d5-gold py-4 text-sm font-bold text-black transition-transform active:scale-[0.98]"
        >
          Commencer
        </button>
      </div>
    );
  }

  const valeur = reponses[question.id];
  const repondu =
    question.type === "nombre" || question.type === "echelle"
      ? typeof valeur === "number"
      : Boolean(valeur && String(valeur).trim());

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <button
          onClick={() => {
            setErreur(null);
            setIndex(index - 1);
          }}
          className="flex items-center gap-1.5 text-sm text-d5-muted transition-colors hover:text-white"
        >
          <ArrowLeft size={14} />
          Question {index + 1} sur {questions.length}
        </button>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-d5-gold transition-all duration-300"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold leading-snug text-white">{question.question}</h2>
        {question.aide && (
          <p className="mt-2 text-xs leading-relaxed text-d5-muted">{question.aide}</p>
        )}
      </div>

      {question.type === "choix" && (
        <div className="space-y-2">
          {question.choix.map((c) => (
            <button
              key={c.valeur}
              onClick={() => repondre(c.valeur)}
              className={`w-full rounded-2xl border-2 px-5 py-4 text-left text-sm transition-all ${
                valeur === c.valeur
                  ? "border-d5-gold bg-d5-gold/10 text-white"
                  : "border-transparent bg-d5-surface-2 text-gray-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {question.type === "texte" && (
        <textarea
          value={typeof valeur === "string" ? valeur : ""}
          onChange={(e) => repondre(e.target.value)}
          rows={4}
          placeholder={question.exemple}
          className="w-full resize-none rounded-2xl border border-transparent bg-d5-surface-2 px-4 py-3 text-base leading-relaxed text-white placeholder-d5-muted focus:border-d5-gold/50 focus:outline-none"
        />
      )}

      {question.type === "nombre" && (
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={typeof valeur === "number" ? valeur : ""}
            onChange={(e) => repondre(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-28 rounded-2xl border border-transparent bg-d5-surface-2 px-4 py-3 text-center text-xl font-bold text-white focus:border-d5-gold/50 focus:outline-none"
          />
          <span className="text-sm text-d5-muted">{question.unite}</span>
        </div>
      )}

      {question.type === "echelle" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => repondre(n)}
                className={`flex-1 rounded-xl border-2 py-4 text-base font-bold transition-all ${
                  valeur === n
                    ? "border-d5-gold bg-d5-gold/10 text-white"
                    : "border-transparent bg-d5-surface-2 text-d5-muted"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-d5-muted">
            <span>{question.bas}</span>
            <span>{question.haut}</span>
          </div>
        </div>
      )}

      {erreur && <p className="text-sm text-red-400">{erreur}</p>}

      <button
        onClick={suivant}
        disabled={!repondu || isPending}
        className="w-full rounded-xl bg-d5-gold py-4 text-sm font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        {isPending ? "Envoi…" : dernier ? "Envoyer à mon coach" : "Continuer"}
      </button>
      {!repondu && (
        <p className="text-center text-xs text-d5-muted">Réponds pour continuer.</p>
      )}
    </div>
  );
}
