"use client";

import { upload } from "@vercel/blob/client";

/**
 * Envoie un fichier du téléphone vers le stockage, sans passer par le serveur.
 *
 * Le serveur ne fait que délivrer une autorisation courte (voir
 * /api/televersement) ; les octets vont directement du téléphone au stockage.
 * C'est ce qui lève le plafond d'un mégaoctet des actions serveur, sous lequel
 * la plupart des photos de téléphone et toutes les vidéos échouaient.
 *
 * `multipart` pour les gros fichiers : une vidéo envoyée d'un bloc en 4G se
 * perd entièrement à la moindre coupure, alors qu'en morceaux seul le morceau
 * interrompu est réessayé.
 */

/** Au-delà de cette taille, l'envoi est découpé. */
const SEUIL_MORCEAUX = 8 * 1024 * 1024;

export type Usage = "repas" | "progression" | "progression-video";

export async function televerser(
  usage: Usage,
  fichier: File,
  onProgression?: (pourcent: number) => void
): Promise<{ chemin: string } | { erreur: string }> {
  try {
    const resultat = await upload(fichier.name || "fichier", fichier, {
      access: "private",
      handleUploadUrl: "/api/televersement",
      clientPayload: usage,
      contentType: fichier.type || undefined,
      multipart: fichier.size > SEUIL_MORCEAUX,
      onUploadProgress: onProgression
        ? ({ percentage }) => onProgression(Math.round(percentage))
        : undefined,
    });
    return { chemin: resultat.pathname };
  } catch (err) {
    console.error("[televerser]", err);
    // Le message du stockage est technique et en anglais. Les deux causes
    // réelles sont le réseau et le stockage non configuré ; dans les deux cas
    // la seule chose utile à dire est de réessayer.
    return { erreur: "Envoi impossible. Vérifie ta connexion et réessaie." };
  }
}
