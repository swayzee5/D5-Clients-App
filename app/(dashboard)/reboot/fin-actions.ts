"use server";

import { auth } from "@/auth";
import { marquerFin } from "@/lib/queries/reboot-fin";

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
