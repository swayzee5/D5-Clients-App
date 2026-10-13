import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";

/**
 * Lecture automatique d'une photo de repas.
 *
 * Ce qu'elle ne fait pas, et c'est le point le plus important : elle ne rend
 * jamais de calories ni de grammes. L'estimation calorique à partir d'une
 * photo se trompe de trente à quarante pour cent — l'huile de cuisson ne se
 * voit pas, ce qu'il y a sous la surface non plus. Le jour où un client pèse
 * son assiette et constate l'écart, il cesse de croire l'application, puis le
 * coach. Un chiffre faux coûte plus cher que pas de chiffre du tout.
 *
 * Ce qui se lit honnêtement sur une photo, c'est la structure de l'assiette :
 * y a-t-il une protéine, des légumes, quelle est la taille relative de la
 * portion, est-ce cuisiné ou industriel. C'est aussi, chez un homme de
 * quarante ans, ce qui change le plus de résultats.
 *
 * L'analyse reste un confort. Si elle échoue, le repas part quand même chez le
 * coach : le service tient sans elle, et c'est délibéré.
 */

/**
 * Ce que le modèle doit rendre. Aucun champ chiffré, voir ci-dessus.
 *
 * En schéma JSON plutôt qu'en Zod : l'assistant Zod du SDK attend Zod 4, et ce
 * projet est en Zod 3. Convertir tout le projet pour une seule fonction serait
 * un mauvais échange.
 */
const SCHEMA_ANALYSE = {
  type: "object",
  properties: {
    /** Les aliments identifiables, tels qu'un humain les nommerait. */
    aliments: { type: "array", items: { type: "string" } },
    /** Y a-t-il une source de protéine identifiable ? */
    proteine: { type: "boolean" },
    /** Des légumes ou crudités ? */
    legumes: { type: "boolean" },
    /** Un féculent (pâtes, riz, pain, pommes de terre, légumineuses) ? */
    feculent: { type: "boolean" },
    /** Taille de la portion, relative à une assiette ordinaire. */
    portion: { type: "string", enum: ["petite", "moyenne", "copieuse"] },
    /** Degré de transformation dominant. */
    preparation: { type: "string", enum: ["maison", "mixte", "industriel"] },
    /**
     * Une phrase factuelle, descriptive, destinée au coach autant qu'au
     * client. Jamais une prescription : c'est le coach qui prescrit.
     */
    observation: { type: "string" },
    /**
     * Ce que la photo ne permet pas de dire. Rempli quand l'image est floue,
     * sombre, ou que le plat est couvert. Le reconnaître vaut mieux que de
     * deviner avec aplomb.
     */
    incertitude: { type: ["string", "null"] },
  },
  required: [
    "aliments",
    "proteine",
    "legumes",
    "feculent",
    "portion",
    "preparation",
    "observation",
    "incertitude",
  ],
  additionalProperties: false,
} as const;

export type AnalyseRepas = {
  aliments: string[];
  proteine: boolean;
  legumes: boolean;
  feculent: boolean;
  portion: "petite" | "moyenne" | "copieuse";
  preparation: "maison" | "mixte" | "industriel";
  observation: string;
  incertitude: string | null;
};

const CONSIGNE = `Tu regardes la photo d'un repas envoyée par un homme de 40 à 60 ans suivi par un coach sportif.

Décris ce que tu vois, factuellement, sans juger et sans prescrire. Le coach lira ton analyse avant de répondre lui-même au client : tu prépares son travail, tu ne le remplaces pas.

Règles absolues :
- Ne donne jamais de calories, de grammes, ni de macros chiffrées. Tu ne peux pas les connaître à partir d'une photo, et un chiffre faux détruit la confiance.
- Si l'image est floue, sombre, prise de trop loin, ou si le plat est couvert, dis-le dans « incertitude » plutôt que de deviner.
- « observation » fait une phrase, en français, au ton neutre et concret. Décris la composition de l'assiette, pas ce qu'il faudrait faire.
- Si la photo ne montre pas de nourriture, laisse les listes vides et explique-le dans « incertitude ».`;

/**
 * Analyse une photo de repas.
 *
 * Renvoie `null` plutôt que de lever : l'appelant enregistre le repas dans
 * tous les cas, et une panne de l'API ne doit pas faire perdre la photo d'un
 * client.
 */
export async function analyserRepas(
  image: { base64: string; mediaType: string },
  noteClient?: string | null
): Promise<{ analyse: AnalyseRepas | null; erreur: string | null }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { analyse: null, erreur: "ANTHROPIC_API_KEY absente" };
  }

  // Le format est contraint au type près par le schéma : sans ça, il faudrait
  // valider à la main une réponse en texte libre, et traiter le jour où elle
  // arrive en prose.
  const type = mediaTypeAccepte(image.mediaType);
  if (!type) {
    return { analyse: null, erreur: `Format d'image non géré : ${image.mediaType}` };
  }

  try {
    const client = new Anthropic();
    const reponse = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // L'effort par défaut de ce modèle suffit largement : décrire une
      // assiette n'est pas un problème de raisonnement, et monter l'effort
      // n'achèterait que de la latence devant un client qui attend.
      output_config: { effort: "low", format: jsonSchemaOutputFormat(SCHEMA_ANALYSE) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: type, data: image.base64 } },
            {
              type: "text",
              text: noteClient?.trim()
                ? `${CONSIGNE}\n\nLe client a ajouté ce commentaire : « ${noteClient.trim()} »`
                : CONSIGNE,
            },
          ],
        },
      ],
    });

    // parsed_output vaut null si la réponse n'a pas pu être validée. On le
    // traite comme une panne : mieux vaut pas d'analyse qu'une analyse à
    // moitié remplie affichée comme fiable.
    return reponse.parsed_output
      ? { analyse: reponse.parsed_output as AnalyseRepas, erreur: null }
      : { analyse: null, erreur: "Réponse illisible" };
  } catch (err) {
    console.error("[analyse-repas]", err);
    return { analyse: null, erreur: String(err).slice(0, 300) };
  }
}

/** Les formats que l'API accepte. Un HEIC d'iPhone n'en fait pas partie. */
function mediaTypeAccepte(
  type: string
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | null {
  switch (type) {
    case "image/jpeg":
    case "image/jpg":
      return "image/jpeg";
    case "image/png":
      return "image/png";
    case "image/gif":
      return "image/gif";
    case "image/webp":
      return "image/webp";
    default:
      return null;
  }
}

/**
 * Résumé d'une assiette en une ligne, pour la liste du client et la file du
 * coach. Les trois piliers d'abord, parce que c'est ce qui se lit d'un coup
 * d'œil et ce sur quoi le coach agit.
 */
export function resumerAnalyse(a: AnalyseRepas): string {
  const pieces = [
    a.proteine ? "protéine ✓" : "pas de protéine",
    a.legumes ? "légumes ✓" : "pas de légumes",
    a.feculent ? "féculent ✓" : null,
  ].filter(Boolean);
  return `${pieces.join(" · ")} · portion ${a.portion}`;
}
