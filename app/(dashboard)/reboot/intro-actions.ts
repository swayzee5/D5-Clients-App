"use server";

import { auth } from "@/auth";
import { markIntroWatched } from "@/lib/queries/reboot-intro";

/**
 * Le participant a vu la vidéo — ou n'a pas pu la lire.
 *
 * L'identifiant vient de la session, jamais du client : cette action ouvre
 * l'accès au challenge, et une valeur transmise par le navigateur permettrait
 * de l'ouvrir pour quelqu'un d'autre.
 *
 * `secours` est enregistré à part pour que le coach sache à qui la vidéo n'a
 * jamais été montrée, et puisse la lui envoyer en privé.
 */
export async function confirmIntroWatched(methode: "video" | "secours"): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) return false;
    await markIntroWatched(session.user.id, methode);
    return true;
  } catch (err) {
    console.error("[confirmIntroWatched]", err);
    return false;
  }
}
