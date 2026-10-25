import { NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { stockageUtilisable, modeBlob, storeIdPrive, jetonPrive, priveUtilisable } from "@/lib/blob-token";

/**
 * Autorise un envoi de fichier depuis le téléphone, directement vers le
 * stockage.
 *
 * Pourquoi ce détour plutôt qu'une action serveur qui reçoit le fichier :
 * Next.js plafonne le corps d'une action serveur à un mégaoctet par défaut, et
 * la plateforme ajoute sa propre limite sur les fonctions. Une photo d'iPhone
 * pèse deux à cinq mégaoctets, une vidéo de quinze secondes cinquante. Le code
 * annonçait dix mégaoctets et la plupart des envois auraient échoué, avec une
 * erreur que personne n'aurait su interpréter.
 *
 * Ici le fichier ne transite jamais par le serveur : celui-ci se contente de
 * délivrer une autorisation courte, et le téléphone dépose directement. Plus
 * rapide, sans plafond, et moins coûteux.
 *
 * Ce que cette route garantit, et qui ne peut pas être laissé au navigateur :
 *
 *   1. Il faut une session. Sans elle, aucune autorisation n'est délivrée.
 *   2. Le chemin est imposé par le serveur à partir de l'identifiant de
 *      session. Le navigateur propose un nom, le serveur décide où il va —
 *      sinon n'importe qui pourrait écrire dans le dossier d'un autre.
 *   3. Les types et la taille sont bornés côté serveur. Les vérifications du
 *      navigateur n'engagent que lui.
 */

export const dynamic = "force-dynamic";

/** Les dossiers autorisés, et ce qu'on y accepte. */
const USAGES = {
  repas: {
    types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    tailleMax: 15 * 1024 * 1024,
  },
  progression: {
    types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    tailleMax: 15 * 1024 * 1024,
  },
  "progression-video": {
    // Une rotation de quinze secondes filmée au téléphone. Les formats sont
    // ceux que produisent iOS et Android sans conversion.
    types: ["video/mp4", "video/quicktime", "video/webm"],
    tailleMax: 200 * 1024 * 1024,
  },
} as const;

type Usage = keyof typeof USAGES;

function usageValide(valeur: string): valeur is Usage {
  return Object.prototype.hasOwnProperty.call(USAGES, valeur);
}

export async function GET(): Promise<Response> {
  const session = await auth().catch((err) => {
    console.error("[televersement] auth", err);
    return null;
  });

  return Response.json({
    // L'identifiant de SA propre session, et rien d'autre : c'est ce qui
    // permet au navigateur de composer un chemin que le serveur acceptera.
    clientId: session?.user?.id ?? null,
    session: session?.user?.id ? "ouverte" : "absente",
    stockage: stockageUtilisable() ? `configuré — ${modeBlob()}` : "aucun moyen d'authentification",
    storePrivé: jetonPrive()
      ? "configuré (jeton)"
      : storeIdPrive()
      ? "identifiant présent, mais pas de jeton — l'envoi depuis le téléphone en a besoin"
      : "absent (PHOTOS_READ_WRITE_TOKEN)",
    usagesAcceptés: Object.keys(USAGES),
    diagnostic: !session?.user?.id
      ? "La session n'est pas vue par la route. C'est elle qui bloque l'autorisation."
      : !stockageUtilisable()
      ? "Session ouverte, mais le stockage n'est pas configuré sur ce déploiement."
      : !priveUtilisable()
      ? "Session et stockage bons, mais aucun store privé : les photos ne peuvent pas être déposées sans devenir publiques."
      : "Session et stockage sont bons : le refus vient d'ailleurs.",
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  // Dit tout de suite ce qui manque. Sans jeton, la bibliothèque échoue avec
  // un message technique en anglais, que le client voit traduit en « vérifie
  // ta connexion » — alors que le réseau n'y est pour rien et qu'aucune
  // tentative ne marchera jamais.
  if (!stockageUtilisable()) {
    return Response.json(
      { error: "Stockage non configuré : ni jeton, ni BLOB_STORE_ID sur ce projet." },
      { status: 503 }
    );
  }

  // Sans store privé, on refuse. Déposer ces photos dans le store public
  // serait un repli silencieux qui rendrait lisibles par simple lien des
  // images que personne n'a accepté de partager.
  if (!priveUtilisable()) {
    return Response.json(
      {
        error:
          "Aucun store privé configuré (PHOTOS_READ_WRITE_TOKEN). Les photos ne sont pas déposées dans un store public.",
      },
      { status: 503 }
    );
  }

  const corps = (await req.json()) as HandleUploadBody;

  try {
    const reponse = await handleUpload({
      body: corps,
      request: req,
      // Passés explicitement : la variable ne porte pas toujours le nom que
      // la bibliothèque lit d'elle-même, et le store privé n'est pas celui
      // par défaut du projet.
      token: jetonPrive(),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.id) {
          console.error("[televersement] refus : aucune session");
          throw new Error("Session expirée");
        }

        const usage = (clientPayload ?? "").trim();
        if (!usageValide(usage)) throw new Error("Usage inconnu");
        const regles = USAGES[usage];

        // Le chemin est VÉRIFIÉ ici, et non réécrit : cette version de la
        // bibliothèque ignore un `pathname` renvoyé par le serveur. C'est le
        // navigateur qui le compose, donc il doit être contrôlé — sans quoi
        // n'importe qui pourrait écrire dans le dossier d'un autre.
        //
        // C'est aussi ce qui manquait : le chemin imposé étant ignoré, c'est
        // le nom du fichier de l'appareil qui servait — le même à chaque
        // photo, d'où le refus « ce fichier existe déjà ».
        const prefixe = `${usage}/${session.user.id}/`;
        if (!pathname.startsWith(prefixe)) {
          throw new Error("Chemin refusé");
        }

        return {
          allowedContentTypes: [...regles.types],
          maximumSizeInBytes: regles.tailleMax,
          // Deux photos prises dans la même seconde ne doivent pas se
          // marcher dessus : le suffixe aléatoire est ajouté par le
          // stockage, après le dossier, qui reste donc vérifiable.
          addRandomSuffix: true,
          // L'autorisation ne vaut qu'une heure : assez pour un envoi en 4G
          // sur un réseau médiocre, trop peu pour être réutilisée plus tard.
          validUntil: Date.now() + 60 * 60 * 1000,
        };
      },
      onUploadCompleted: async () => {
        // Rien à faire : la ligne en base est écrite par l'action qui suit
        // l'envoi, côté client. Ce rappel n'arrive pas en développement local
        // et ne peut donc pas porter une étape indispensable.
      },
    });

    return Response.json(reponse);
  } catch (err) {
    console.error("[televersement]", err);
    return Response.json({ error: String(err) }, { status: 400 });
  }
}
