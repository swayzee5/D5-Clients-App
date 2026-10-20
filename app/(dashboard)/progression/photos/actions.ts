"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { deposer, supprimer, TAILLE_MAX } from "@/lib/photos-privees";
import { enregistrerPhoto, type AnglePhoto } from "@/lib/queries/progression-photos";

/**
 * Envoi d'une photo de progression.
 *
 * L'identifiant du client vient de la session, jamais du formulaire. Ce sont
 * les images les plus sensibles de l'application : les attribuer à quelqu'un
 * d'autre serait montrer un corps à la mauvaise personne.
 *
 * La date est posée par le serveur. Laisser le navigateur l'envoyer ouvrirait
 * la porte à des entrées antidatées, et surtout à l'horloge décalée d'un
 * téléphone — une photo classée la veille ne se compare plus à rien.
 */
const ANGLES_VALIDES: AnglePhoto[] = ["front", "side", "back"];

export async function envoyerPhotoProgression(
  formData: FormData
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erreur: "Session expirée. Reconnecte-toi." };

  const angle = formData.get("angle") as string;
  if (!ANGLES_VALIDES.includes(angle as AnglePhoto)) {
    return { ok: false, erreur: "Angle inconnu." };
  }

  const fichier = formData.get("photo");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { ok: false, erreur: "Aucune photo reçue." };
  }
  if (fichier.size > TAILLE_MAX) {
    return { ok: false, erreur: "Photo trop lourde (10 Mo maximum)." };
  }
  if (!fichier.type.startsWith("image/")) {
    return { ok: false, erreur: "Ce fichier n'est pas une image." };
  }

  const depot = await deposer("progression", session.user.id, fichier);
  if ("erreur" in depot) return { ok: false, erreur: depot.erreur };

  try {
    const { remplace } = await enregistrerPhoto({
      clientId: session.user.id,
      date: new Date().toISOString().slice(0, 10),
      angle: angle as AnglePhoto,
      cheminPhoto: depot.chemin,
    });
    // Reprendre sa photo du jour remplace la précédente : l'ancienne n'est
    // plus référencée nulle part et n'a pas à rester dans le stockage.
    if (remplace) await supprimer(remplace);
  } catch (err) {
    console.error("[envoyerPhotoProgression]", err);
    // La ligne n'a pas pu être écrite : le fichier déposé n'appartient à
    // personne et ne sera jamais affiché.
    await supprimer(depot.chemin);
    return { ok: false, erreur: "Enregistrement impossible. Réessaie dans un instant." };
  }

  revalidatePath("/progression/photos");
  revalidatePath("/progression");
  return { ok: true };
}
