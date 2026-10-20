/**
 * Le suivi nutritionnel : un questionnaire au départ, un point toutes les six
 * semaines.
 *
 * Pourquoi six et non quatre : la nutrition met plus longtemps que
 * l'entraînement à produire un écart lisible. À quatre semaines, beaucoup
 * répondent « je ne sais pas trop » et le point ne sert à rien ; à six, il y a
 * quelque chose à dire.
 *
 * Pourquoi un questionnaire plutôt qu'un plan envoyé d'emblée : un plan qui
 * ignore qui cuisine, combien de repas sont pris au travail et ce que la
 * personne refuse de supprimer ne sera pas suivi une semaine. Ces réponses-là
 * valent plus que n'importe quel calcul de calories.
 *
 * Ce fichier ne touche ni à React ni à la base : il est importable des deux
 * côtés.
 */

export const VERSION_QUESTIONNAIRE = 1;

/** Le délai entre deux points, en jours. */
export const JOURS_ENTRE_POINTS = 42;

type Choix = { valeur: string; label: string };

export type QuestionNutrition =
  | { id: string; type: "texte"; question: string; aide?: string; exemple: string }
  | { id: string; type: "choix"; question: string; aide?: string; choix: Choix[] }
  | { id: string; type: "nombre"; question: string; aide?: string; unite: string }
  | { id: string; type: "echelle"; question: string; aide?: string; bas: string; haut: string };

/**
 * Le questionnaire de départ.
 *
 * Huit questions, pas une de plus. Elles portent toutes sur des contraintes
 * réelles plutôt que sur des préférences : ce sont les contraintes qui font
 * abandonner un plan, jamais les goûts.
 *
 * La question de santé est là pour savoir s'arrêter. Un coach n'établit pas de
 * régime pour quelqu'un sous traitement ou suivi pour une pathologie — il
 * l'oriente, et il le sait avant d'écrire quoi que ce soit.
 */
export const QUESTIONS_DEPART: QuestionNutrition[] = [
  {
    id: "rythme",
    type: "choix",
    question: "À quoi ressemblent tes journées, côté repas ?",
    choix: [
      { valeur: "trois_repas", label: "Trois repas, à peu près à heures fixes" },
      { valeur: "deux_repas", label: "Deux repas, je saute souvent le petit-déjeuner" },
      { valeur: "grignote", label: "Je mange par morceaux, sans vrai repas" },
      { valeur: "irregulier", label: "Ça dépend complètement des jours" },
    ],
  },
  {
    id: "exterieur",
    type: "nombre",
    question: "Combien de repas par semaine prends-tu à l'extérieur ?",
    aide: "Restaurant, cantine, sandwich, chantier, voiture. Compte large.",
    unite: "repas",
  },
  {
    id: "cuisine",
    type: "choix",
    question: "Qui prépare les repas chez toi ?",
    aide: "C'est ce qui décide de ce qui est réellement faisable.",
    choix: [
      { valeur: "moi", label: "Moi, et j'aime ça" },
      { valeur: "moi_contraint", label: "Moi, mais je n'ai pas le temps" },
      { valeur: "autre", label: "Quelqu'un d'autre à la maison" },
      { valeur: "personne", label: "Personne, j'achète tout prêt" },
    ],
  },
  {
    id: "exclusions",
    type: "texte",
    question: "Y a-t-il des aliments que tu ne peux pas ou ne veux pas manger ?",
    aide: "Allergies, intolérances, convictions, dégoûts. Tout compte.",
    exemple: "ex : intolérant au lactose, pas de porc, je déteste le poisson…",
  },
  {
    id: "sante",
    type: "texte",
    question: "Es-tu suivi pour un problème de santé, ou sous traitement ?",
    aide: "Diabète, tension, cholestérol, thyroïde, statines… Dis-le même si ça te paraît sans rapport. C'est ce qui me dit quand je dois t'orienter vers un professionnel plutôt que te conseiller moi-même.",
    exemple: "ex : hypertension traitée depuis deux ans. Ou : rien.",
  },
  {
    id: "intouchable",
    type: "texte",
    question: "Qu'est-ce que tu refuses de supprimer ?",
    aide: "La question la plus utile du questionnaire. Un plan qui interdit ce à quoi tu tiens ne tient pas trois semaines — autant le prévoir.",
    exemple: "ex : mon verre de vin le week-end, le pain au petit-déjeuner…",
  },
  {
    id: "moment_difficile",
    type: "choix",
    question: "À quel moment ça dérape, en général ?",
    choix: [
      { valeur: "apres_midi", label: "L'après-midi, vers 16h" },
      { valeur: "soir", label: "Le soir, après le repas" },
      { valeur: "nuit", label: "La nuit, ou en rentrant tard" },
      { valeur: "weekend", label: "Le week-end, ou en sortie" },
      { valeur: "jamais", label: "Ça ne dérape pas vraiment" },
    ],
  },
  {
    id: "alcool",
    type: "choix",
    question: "L'alcool, à quelle fréquence ?",
    aide: "Sans jugement : c'est souvent le premier levier, et le plus simple.",
    choix: [
      { valeur: "jamais", label: "Jamais ou presque" },
      { valeur: "weekend", label: "Le week-end" },
      { valeur: "souvent", label: "Plusieurs fois par semaine" },
      { valeur: "quotidien", label: "Tous les jours" },
    ],
  },
];

/**
 * Le point de six semaines.
 *
 * Plus court que le questionnaire de départ, et volontairement. On ne
 * redemande pas qui cuisine ni ce qu'il refuse de supprimer : ça ne change
 * pas, et le redemander apprend surtout que personne n'a lu la réponse
 * précédente. On demande ce qui a bougé.
 */
export const QUESTIONS_POINT: QuestionNutrition[] = [
  {
    id: "tenu",
    type: "echelle",
    question: "Sur ces six semaines, tu as tenu le plan…",
    bas: "Pas du tout",
    haut: "Presque tout le temps",
  },
  {
    id: "obstacle",
    type: "texte",
    question: "Qu'est-ce qui t'en a empêché, quand ça n'a pas tenu ?",
    aide: "C'est la réponse qui me sert le plus. Sans elle, je réécris le même plan.",
    exemple: "ex : les déjeuners au boulot, impossible de trouver autre chose…",
  },
  {
    id: "faim",
    type: "choix",
    question: "Et la faim, dans tout ça ?",
    choix: [
      { valeur: "jamais_faim", label: "Je n'ai jamais faim, je force parfois" },
      { valeur: "equilibre", label: "Ça va, je mange à ma faim" },
      { valeur: "souvent_faim", label: "J'ai souvent faim entre les repas" },
      { valeur: "affame", label: "J'ai faim en permanence" },
    ],
  },
  {
    id: "energie",
    type: "echelle",
    question: "Ton énergie sur la journée, comparée à il y a six semaines",
    bas: "Moins bonne",
    haut: "Nettement meilleure",
  },
  {
    id: "changement",
    type: "texte",
    question: "S'il y avait une seule chose à changer pour les six prochaines semaines ?",
    aide: "Une seule. C'est ce qui rend un ajustement tenable.",
    exemple: "ex : trouver une solution pour les déjeuners du midi",
  },
];

export type ReponsesNutrition = Record<string, string | number>;

/** Les questions manquantes, pour bloquer un envoi incomplet. */
export function reponsesManquantes(
  questions: QuestionNutrition[],
  reponses: ReponsesNutrition
): string[] {
  return questions
    .filter((q) => {
      const valeur = reponses[q.id];
      if (q.type === "nombre" || q.type === "echelle") return typeof valeur !== "number";
      return !valeur || !String(valeur).trim();
    })
    .map((q) => q.id);
}

/** Jours écoulés entre deux dates, sans tenir compte de l'heure. */
export function joursEcoules(depuis: Date, jusqua: Date): number {
  const a = Date.UTC(depuis.getUTCFullYear(), depuis.getUTCMonth(), depuis.getUTCDate());
  const b = Date.UTC(jusqua.getUTCFullYear(), jusqua.getUTCMonth(), jusqua.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

/**
 * Le point est-il dû ?
 *
 * Compté depuis le dernier envoi, pas depuis une date de départ fixe : un
 * client qui répond avec dix jours de retard a son point suivant six semaines
 * après sa réponse, pas six semaines après une échéance qu'il a manquée. Sans
 * ça, les retards s'accumulent et il finit par recevoir deux relances dans la
 * même semaine.
 */
export function pointDu(dernierEnvoi: Date | null, aujourdhui: Date): boolean {
  if (!dernierEnvoi) return false;
  return joursEcoules(dernierEnvoi, aujourdhui) >= JOURS_ENTRE_POINTS;
}

/** Jours restants avant le prochain point. Négatif s'il est en retard. */
export function joursAvantPoint(dernierEnvoi: Date, aujourdhui: Date): number {
  return JOURS_ENTRE_POINTS - joursEcoules(dernierEnvoi, aujourdhui);
}
