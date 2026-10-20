"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { supprimer } from "@/lib/photos-privees";
import { enregistrerPhoto, type AnglePhoto } from "@/lib/queries/progression-photos";

/**
 * Enregistre une photo ou une vidéo de progression déjà déposée.
 *
 * Le fichier ne passe plus par ici : il va du téléphone au stockage, et cette
 * action ne reçoit que son chemin. Le détour était imposé par le plafond d'un
 * mégaoctet des actions serveur, sous lequel la plupart des photos de
 * téléphone échouaient.
 *
 * Le chemin vient donc du navigateur, ce qui oblige à le vérifier : il doit
 * commencer par le dossier d'usage suivi de l'identifiant de session. Sans ce
 * contrôle, quelqu'un pourrait s'attribuer le fichier d'un autre en lui
 * envoyant son chemin — et ce sont, de toute l'application, les images qu'il
 * faut le moins laisser se promener.
 *
 * La date est posée par le serveur. L'horloge d'un téléphone se décale, et une
 * photo classée la veille ne se compare plus à rien.
 */

const ANGLES_VALIDES: AnglePhoto[] = ["front", "side", "back", "video"];

export async function enregistrerMediaProgression(valeurs: {
  angle: string;
  chemin: string;
}): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erreur: "Session expirée. Reconnecte-toi." };

  if (!ANGLES_VALIDES.includes(valeurs.angle as AnglePhoto)) {
    return { ok: false, erreur: "Angle inconnu." };
  }

  const dossier = valeurs.angle === "video" ? "progression-video" : "progression";
  const prefixeAttendu = `${dossier}/${session.user.id}/`;
  if (!valeurs.chemin.startsWith(prefixeAttendu)) {
    return { ok: false, erreur: "Fichier inattendu." };
  }

  try {
    const { remplace } = await enregistrerPhoto({
      clientId: session.user.id,
      date: new Date().toISOString().slice(0, 10),
      angle: valeurs.angle as AnglePhoto,
      cheminPhoto: valeurs.chemin,
    });
    // Reprendre une prise du jour remplace la précédente : l'ancienne n'est
    // plus référencée nulle part et n'a pas à rester dans le stockage.
    if (remplace) await supprimer(remplace);
  } catch (err) {
    console.error("[enregistrerMediaProgression]", err);
    // Le fichier est déjà déposé mais n'appartient à personne : on le retire
    // plutôt que de le laisser s'accumuler sans rien pour le retrouver.
    await supprimer(valeurs.chemin);
    return { ok: false, erreur: "Enregistrement impossible. Réessaie dans un instant." };
  }

  revalidatePath("/progression/photos");
  revalidatePath("/progression");
  return { ok: true };
}
