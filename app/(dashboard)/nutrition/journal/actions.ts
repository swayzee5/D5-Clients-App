"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { analyserRepas } from "@/lib/analyse-repas";
import { deposerPhoto, supprimerPhoto, TAILLE_MAX } from "@/lib/photo-repas";
import { enregistrerRepas } from "@/lib/queries/journal-repas";

/**
 * Envoi d'une photo de repas.
 *
 * L'ordre des opérations compte. La photo est déposée d'abord, enregistrée
 * ensuite, analysée au milieu — et si l'analyse échoue, le repas est tout de
 * même enregistré. Le service rendu au client, c'est que son coach voie son
 * assiette ; la lecture automatique n'est qu'un confort, et la faire échouer
 * bruyamment reviendrait à perdre une photo pour une panne d'API.
 *
 * L'identifiant du client vient de la session, jamais du formulaire : ces
 * photos partent chez un coach qui les lit comme un suivi, et une assiette
 * attribuée à quelqu'un d'autre fausserait son jugement sur deux clients à la
 * fois.
 */
export async function envoyerRepas(
  formData: FormData
): Promise<{ ok: true; id: string } | { ok: false; erreur: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erreur: "Session expirée. Reconnecte-toi." };

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

  const note = (formData.get("note") as string | null)?.slice(0, 500) ?? null;

  const depot = await deposerPhoto(session.user.id, fichier);
  if ("erreur" in depot) return { ok: false, erreur: depot.erreur };

  // Les octets sont déjà en mémoire ici : les relire depuis le stockage pour
  // les envoyer à l'analyse ferait un aller-retour pour rien.
  let analyse = null;
  let analyseErreur: string | null = null;
  try {
    const octets = Buffer.from(await fichier.arrayBuffer());
    const resultat = await analyserRepas(
      { base64: octets.toString("base64"), mediaType: fichier.type },
      note
    );
    analyse = resultat.analyse;
    analyseErreur = resultat.erreur;
  } catch (err) {
    analyseErreur = String(err).slice(0, 300);
  }

  try {
    const id = await enregistrerRepas({
      clientId: session.user.id,
      photoPath: depot.chemin,
      noteClient: note,
      analyse,
      analyseErreur,
    });
    revalidatePath("/nutrition/journal");
    revalidatePath("/nutrition");
    return { ok: true, id };
  } catch (err) {
    // La ligne n'a pas pu être écrite : la photo déposée n'appartient à
    // personne et ne sera jamais affichée. On la retire plutôt que de la
    // laisser s'accumuler dans le stockage sans rien pour la retrouver.
    console.error("[envoyerRepas]", err);
    await supprimerPhoto(depot.chemin);
    return { ok: false, erreur: "Enregistrement impossible. Réessaie dans un instant." };
  }
}
