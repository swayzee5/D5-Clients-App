"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { analyserRepas } from "@/lib/analyse-repas";
import { lireOctets, supprimer } from "@/lib/photos-privees";
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
export async function envoyerRepas(valeurs: {
  chemin: string;
  typeImage: string;
  note?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; erreur: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erreur: "Session expirée. Reconnecte-toi." };

  // Le chemin vient du navigateur : il doit commencer par le dossier d'usage
  // suivi de l'identifiant de session. Sans ce contrôle, quelqu'un pourrait
  // s'attribuer la photo d'un autre en envoyant son chemin.
  // Normalisé avant comparaison : selon le store, le chemin revient parfois
  // avec une barre de tête ou préfixé par le dossier du store. Ce qui doit
  // être garanti, c'est que le fichier est bien dans le dossier de CE
  // client — pas la forme exacte de la chaîne.
  const chemin = valeurs.chemin.replace(/^\/+/, "");
  const attendu = `repas/${session.user.id}/`;
  const position = chemin.indexOf(attendu);
  if (position === -1) {
    // Le chemin reçu est nommé : « fichier inattendu » sans dire lequel
    // oblige à deviner, et c'est le client qui en paie le temps.
    return { ok: false, erreur: `Fichier inattendu (${chemin.slice(0, 80)}).` };
  }

  const note = valeurs.note?.slice(0, 500) || null;

  // Les octets sont relus depuis le stockage : depuis que la photo va
  // directement du téléphone au stockage — le seul moyen de dépasser le
  // plafond d'un mégaoctet des actions serveur — le serveur ne les a plus
  // sous la main.
  let analyse = null;
  let analyseErreur: string | null = null;
  try {
    const octets = await lireOctets(valeurs.chemin);
    if (!octets) {
      analyseErreur = "Photo illisible depuis le stockage";
    } else {
      const resultat = await analyserRepas(
        { base64: octets.toString("base64"), mediaType: valeurs.typeImage },
        note
      );
      analyse = resultat.analyse;
      analyseErreur = resultat.erreur;
    }
  } catch (err) {
    analyseErreur = String(err).slice(0, 300);
  }

  try {
    const id = await enregistrerRepas({
      clientId: session.user.id,
      photoPath: valeurs.chemin,
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
    await supprimer(valeurs.chemin);
    return { ok: false, erreur: "Enregistrement impossible. Réessaie dans un instant." };
  }
}
