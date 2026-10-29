"use server";

import { auth } from "@/auth";
import { marquerFin, enregistrerIntention, type Intention } from "@/lib/queries/reboot-fin";
import { marquerActivite } from "@/lib/derniere-activite";

/**
 * Suivi de la fin de parcours.
 *
 * Deux signaux seulement : la vidéo a été regardée en entier, et le bouton de
 * rendez-vous a été cliqué. Ils servent au coach à savoir qui relancer à la
 * main — c'est toute leur raison d'être, et c'est pourquoi on ne mesure rien
 * d'autre.
 *
 * Un clic n'est pas une réservation : elle a lieu chez un prestataire
 * extérieur que cette application ne voit pas. Le coach confirme lui-même les
 * rendez-vous depuis le CRM.
 */
export async function suivreFin(quoi: "video" | "cta"): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await marquerFin(session.user.id, quoi);
}

/**
 * La réponse à la question de l'accompagnement.
 *
 * Elle renvoie son résultat, et l'écran l'affiche : c'est la dernière chose
 * que le participant fait de tout le challenge, et une réponse avalée en
 * silence à ce moment-là lui laisserait croire qu'il n'a pas été entendu.
 */
export async function repondreIntention(
  intention: Intention,
  texte: string
): Promise<{ ok: boolean; erreur?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erreur: "Session expirée." };

  if (intention !== "oui" && intention !== "hesite" && intention !== "non") {
    return { ok: false, erreur: "Réponse inattendue." };
  }

  marquerActivite(session.user.id);

  const r = await enregistrerIntention(session.user.id, intention, texte);
  return r.ok
    ? { ok: true }
    : { ok: false, erreur: "Enregistrement impossible. Réessaie dans un instant." };
}
