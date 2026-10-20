"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  QUESTIONS_DEPART,
  QUESTIONS_POINT,
  VERSION_QUESTIONNAIRE,
  reponsesManquantes,
  type ReponsesNutrition,
} from "@/lib/nutrition-suivi";
import { enregistrerEnvoi, dernierEnvoi } from "@/lib/queries/nutrition-suivi";

/**
 * Enregistre un questionnaire nutritionnel ou un point de six semaines.
 *
 * Les réponses sont revalidées ici. Le navigateur vérifie déjà qu'aucune ne
 * manque, mais cette vérification n'engage que lui — et un questionnaire à
 * trous produit un plan à trous, que le coach découvre au moment de l'écrire.
 *
 * Le type est déduit de l'historique et non de ce que le client envoie : le
 * premier envoi est forcément le questionnaire de départ, les suivants sont
 * des points. Laisser le navigateur en décider permettrait de réarmer le
 * compteur des six semaines à volonté.
 */
export async function envoyerSuiviNutrition(valeurs: {
  type: "depart" | "point";
  reponses: ReponsesNutrition;
}): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erreur: "Session expirée. Reconnecte-toi." };

  const precedent = await dernierEnvoi(session.user.id).catch(() => null);
  const type = precedent ? "point" : "depart";
  const questions = type === "depart" ? QUESTIONS_DEPART : QUESTIONS_POINT;

  const manquantes = reponsesManquantes(questions, valeurs.reponses);
  if (manquantes.length > 0) {
    return { ok: false, erreur: "Il manque des réponses." };
  }

  // Seules les réponses aux questions connues sont conservées : ce qui arrive
  // du navigateur n'a pas à se retrouver tel quel dans ce que lira le coach.
  const propres: ReponsesNutrition = {};
  for (const q of questions) {
    const valeur = valeurs.reponses[q.id];
    propres[q.id] = typeof valeur === "number" ? valeur : String(valeur).slice(0, 1000);
  }

  try {
    await enregistrerEnvoi({
      clientId: session.user.id,
      type,
      reponses: propres,
      version: VERSION_QUESTIONNAIRE,
    });
  } catch (err) {
    console.error("[envoyerSuiviNutrition]", err);
    return { ok: false, erreur: "Enregistrement impossible. Réessaie dans un instant." };
  }

  revalidatePath("/nutrition");
  revalidatePath("/nutrition/profil");
  return { ok: true };
}
