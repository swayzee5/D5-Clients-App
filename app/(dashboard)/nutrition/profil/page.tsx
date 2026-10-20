export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  QUESTIONS_DEPART,
  QUESTIONS_POINT,
  joursAvantPoint,
  pointDu,
} from "@/lib/nutrition-suivi";
import { dernierEnvoi } from "@/lib/queries/nutrition-suivi";
import { QuestionnaireNutrition } from "@/components/nutrition/QuestionnaireNutrition";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mon profil alimentaire" };

/**
 * Le questionnaire de départ, puis le point de six semaines.
 *
 * Un seul écran pour les deux : c'est l'historique qui décide lequel
 * s'affiche. Deux pages auraient demandé au client de savoir laquelle le
 * concerne, ce qu'il n'a aucun moyen de deviner.
 *
 * Entre deux points, l'écran ne propose rien et dit quand revenir. Laisser
 * répondre à volonté réarmerait le compteur et noierait le coach sous des
 * points sans écart.
 */
export default async function ProfilNutritionPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const precedent = await dernierEnvoi(session.user.id).catch(() => null);
  const maintenant = new Date();

  const retour = (
    <Link
      href="/nutrition"
      className="inline-flex items-center gap-1.5 text-sm text-d5-muted transition-colors hover:text-white"
    >
      <ArrowLeft size={14} />
      Nutrition
    </Link>
  );

  if (!precedent) {
    return (
      <div className="space-y-5 pb-8">
        {retour}
        <QuestionnaireNutrition
          questions={QUESTIONS_DEPART}
          type="depart"
          titre="Mon profil alimentaire"
          introduction="Avant de te préparer quoi que ce soit, j'ai besoin de connaître tes contraintes réelles — pas tes goûts. Ce sont elles qui font qu'un plan tient ou non."
        />
      </div>
    );
  }

  if (pointDu(precedent.envoyeLe, maintenant)) {
    return (
      <div className="space-y-5 pb-8">
        {retour}
        <QuestionnaireNutrition
          questions={QUESTIONS_POINT}
          type="point"
          titre="Ton point de six semaines"
          introduction="Six semaines ont passé. Cinq questions pour savoir ce qui a tenu, ce qui a coincé, et ce qu'on ajuste."
        />
      </div>
    );
  }

  const jours = joursAvantPoint(precedent.envoyeLe, maintenant);

  return (
    <div className="space-y-5 pb-8">
      {retour}
      <div className="card space-y-2 py-10 text-center">
        <p className="text-3xl">✅</p>
        <p className="font-bold text-white">Ton profil est à jour</p>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-d5-muted">
          Prochain point dans {jours} jour{jours > 1 ? "s" : ""}. Je te préviendrai — tu
          n&apos;as pas à y penser.
        </p>
      </div>
      <p className="px-1 text-xs leading-relaxed text-d5-muted">
        Entre-temps, le plus utile reste de photographier tes repas : c&apos;est ce qui me
        montre ce qui se passe réellement, mieux qu&apos;un questionnaire.
      </p>
    </div>
  );
}
