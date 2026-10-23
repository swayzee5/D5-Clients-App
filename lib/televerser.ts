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
): Promise<{ chemin: string } | { erreur: string; detail?: string }> {
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
    // Les deux causes réelles sont le réseau et le stockage non configuré.
    // Elles appellent des gestes opposés — réessayer, ou prévenir le coach —
    // et les confondre fait réessayer dix fois quelque chose qui ne peut pas
    // marcher.
    if (String(err).includes("BLOB_READ_WRITE_TOKEN")) {
      return {
        erreur:
          "L'envoi de photos n'est pas encore activé sur l'application. Préviens ton coach — ce n'est pas ton téléphone.",
      };
    }
    // Le détail est remonté en plus du message simple. Sans lui, une panne de
    // configuration est indiscernable d'une panne de réseau : on fait
    // réessayer quelqu'un sur quelque chose qui ne marchera jamais.
    // « Failed to retrieve the client token » veut dire que le serveur a
    // refusé l'autorisation, sans dire pourquoi. Le motif est demandé juste
    // après, sinon le message ne sert à rien.
    let motif = "";
    try {
      const d = await fetch("/api/televersement", { cache: "no-store" });
      motif = ` — ${JSON.stringify(await d.json())}`;
    } catch {
      /* Rien de plus à dire que ce qu'on a déjà. */
    }
    return {
      erreur: "Envoi impossible. Vérifie ta connexion et réessaie.",
      detail: `${String(err).slice(0, 200)}${motif}`.slice(0, 600),
    };
  }
}
