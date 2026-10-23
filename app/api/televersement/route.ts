import { NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";

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

/** Extension déduite du nom proposé, bornée à des caractères sûrs. */
function extension(nom: string): string {
  const trouvee = nom.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return trouvee ? trouvee[1] : "bin";
}

/**
 * Pourquoi l'autorisation est refusée.
 *
 * Quand la route refuse, le téléphone n'en sait rien : la bibliothèque de
 * stockage n'affiche que « Failed to retrieve the client token », sans le
 * motif. Trois refus possibles — pas de session, usage inconnu, stockage non
 * configuré — et rien pour les distinguer, alors qu'ils appellent trois
 * gestes différents.
 *
 * Ce GET rejoue les mêmes vérifications et dit laquelle échoue. Il ne
 * téléverse rien et ne révèle pas le jeton.
 */
export async function GET(): Promise<Response> {
  const session = await auth().catch((err) => {
    console.error("[televersement] auth", err);
    return null;
  });

  return Response.json({
    session: session?.user?.id ? "ouverte" : "absente",
    stockage: process.env.BLOB_READ_WRITE_TOKEN ? "configuré" : "BLOB_READ_WRITE_TOKEN manquant",
    usagesAcceptés: Object.keys(USAGES),
    diagnostic: !session?.user?.id
      ? "La session n'est pas vue par la route. C'est elle qui bloque l'autorisation."
      : !process.env.BLOB_READ_WRITE_TOKEN
      ? "Session ouverte, mais le stockage n'est pas configuré sur ce déploiement."
      : "Session et stockage sont bons : le refus vient d'ailleurs.",
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  // Dit tout de suite ce qui manque. Sans jeton, la bibliothèque échoue avec
  // un message technique en anglais, que le client voit traduit en « vérifie
  // ta connexion » — alors que le réseau n'y est pour rien et qu'aucune
  // tentative ne marchera jamais.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Stockage non configuré : BLOB_READ_WRITE_TOKEN manquant sur ce projet." },
      { status: 503 }
    );
  }

  const corps = (await req.json()) as HandleUploadBody;

  try {
    const reponse = await handleUpload({
      body: corps,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.id) {
          console.error("[televersement] refus : aucune session");
          throw new Error("Session expirée");
        }

        const usage = (clientPayload ?? "").trim();
        if (!usageValide(usage)) throw new Error("Usage inconnu");
        const regles = USAGES[usage];

        return {
          allowedContentTypes: [...regles.types],
          maximumSizeInBytes: regles.tailleMax,
          // Le chemin est reconstruit ici : seul le suffixe du nom proposé est
          // retenu, le reste vient de la session. Un navigateur ne choisit pas
          // dans quel dossier il écrit.
          pathname: `${usage}/${session.user.id}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}.${extension(pathname)}`,
          addRandomSuffix: false,
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
