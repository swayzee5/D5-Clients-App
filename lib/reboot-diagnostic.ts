/**
 * Diagnostic de départ Reboot 40 — questions, barème et calcul du score.
 *
 * Tout est ici, et volontairement : le formulaire, le calcul du score et
 * l'affichage côté coach lisent la même définition. Dupliquer les libellés ou
 * le barème dans le composant aurait garanti qu'ils dérivent un jour de ce qui
 * est réellement enregistré.
 *
 * Ce fichier ne touche ni à React ni à la base : il est importable des deux
 * côtés, serveur comme client.
 */

export const QUESTIONNAIRE_VERSION = 1;

/* -------------------------------------------------------------------------
 * Le Reboot Score
 * ---------------------------------------------------------------------- */

export type ScoreKey =
  | "sommeil"
  | "energie"
  | "recuperation"
  | "stress"
  | "motivation"
  | "confiance";

/**
 * Les six axes notés de 1 à 10.
 *
 * Les bornes sont écrites pour que **10 soit toujours le bon côté**. Sans ça,
 * « stress » se lirait à l'envers — un 10 en stress voulant dire « très
 * stressé » — et la moyenne des six n'aurait plus aucun sens. D'où « Gestion du
 * stress » plutôt que « Stress », avec des repères explicites aux extrémités.
 */
export const SCORE_AXES: {
  key: ScoreKey;
  label: string;
  emoji: string;
  low: string;
  high: string;
}[] = [
  { key: "sommeil", label: "Sommeil", emoji: "🌙", low: "Je dors mal", high: "Je dors bien" },
  { key: "energie", label: "Énergie", emoji: "⚡", low: "À plat", high: "Plein d'énergie" },
  {
    key: "recuperation",
    label: "Récupération",
    emoji: "🔋",
    low: "Je mets des jours",
    high: "Je récupère vite",
  },
  {
    key: "stress",
    label: "Gestion du stress",
    emoji: "🧠",
    low: "Je subis",
    high: "Je gère",
  },
  { key: "motivation", label: "Motivation", emoji: "🔥", low: "En panne", high: "Intacte" },
  {
    key: "confiance",
    label: "Confiance en mon corps",
    emoji: "🪞",
    low: "Très faible",
    high: "Solide",
  },
];

/* -------------------------------------------------------------------------
 * Les questions
 * ---------------------------------------------------------------------- */

type Choice = { value: string; label: string };

export type Question =
  | { id: string; kind: "text"; prompt: string; help?: string; placeholder: string }
  | { id: string; kind: "percent"; prompt: string; help?: string }
  | { id: string; kind: "single"; prompt: string; help?: string; choices: Choice[] }
  | {
      id: string;
      kind: "yesno";
      prompt: string;
      help?: string;
      followUp: { prompt: string; placeholder: string };
    }
  | { id: string; kind: "ratings"; prompt: string; help?: string };

/**
 * L'ordre est celui du diagnostic Reboot 40. On ouvre sur le constat, on passe
 * par le vécu, et on ne demande les notes qu'à la fin : à ce moment-là la
 * personne a déjà mis des mots sur sa situation, et se note plus juste.
 */
export const QUESTIONS: Question[] = [
  {
    id: "bascule",
    kind: "text",
    prompt:
      "Quand avez-vous senti que votre corps a cessé de répondre comme avant, malgré vos efforts ?",
    help: "Pour beaucoup, ça commence vers la trentaine. Prenez le temps de raconter.",
    placeholder: "ex : vers 35 ans, après ma deuxième grossesse…",
  },
  {
    id: "batterie",
    kind: "percent",
    prompt: "Si votre énergie du matin était la batterie d'un smartphone, à quel % démarrez-vous ?",
    help: "Faites glisser jusqu'à votre niveau habituel.",
  },
  {
    id: "strategie_15h",
    kind: "single",
    prompt: "Vers 15h, quelle est votre stratégie pour tenir ?",
    choices: [
      { value: "cafe_sucre", label: "Café, sucre, ou les deux" },
      { value: "force_mentale", label: "Je serre les dents, à la force mentale" },
      { value: "ca_va", label: "Rien de particulier, tout va bien" },
    ],
  },
  {
    id: "tentatives",
    kind: "text",
    prompt:
      "Ces 3 dernières années, combien de fois avez-vous essayé de reprendre votre forme en main — et qu'est-ce qui vous a arrêté à chaque fois ?",
    help: "C'est souvent la réponse la plus utile pour moi.",
    placeholder: "ex : trois fois. Ça tient trois semaines, puis le travail reprend le dessus…",
  },
  {
    id: "place_de_soi",
    kind: "single",
    prompt: "Prendre soin de vous, où est-ce que ça se situe ?",
    choices: [
      { value: "identite", label: "Ça fait partie de qui je suis" },
      { value: "plus_tard", label: "C'est ce que je remets toujours à plus tard" },
      { value: "entre_deux", label: "Entre les deux, par périodes" },
    ],
  },
  {
    id: "entourage",
    kind: "yesno",
    prompt: "Si vous retrouviez votre forme, quelqu'un dans votre entourage le remarquerait ?",
    followUp: {
      prompt: "Qui, et à quoi le verrait-il ? (facultatif)",
      placeholder: "ex : ma fille, qui me dit que je suis toujours fatiguée",
    },
  },
  {
    id: "notes",
    kind: "ratings",
    prompt: "Où en êtes-vous aujourd'hui, de 1 à 10 ?",
    help: "C'est ce qui calcule votre Reboot Score de départ. Répondez au ressenti, sans réfléchir trop longtemps.",
  },
  {
    id: "reussite",
    kind: "text",
    prompt:
      "Qu'attendez-vous de ce challenge ? Qu'est-ce qui ferait que cette semaine soit une réussite pour vous ?",
    help: "C'est là-dessus que je m'appuierai pour vous enregistrer un message personnel.",
    placeholder: "ex : réussir à tenir 7 jours d'affilée, sans tout arrêter au troisième",
  },
];

/* -------------------------------------------------------------------------
 * Réponses et score
 * ---------------------------------------------------------------------- */

export type Ratings = Record<ScoreKey, number>;

export type Answers = {
  bascule?: string;
  batterie?: number;
  strategie_15h?: string;
  tentatives?: string;
  place_de_soi?: string;
  entourage?: { value: "oui" | "non"; detail?: string };
  notes?: Partial<Ratings>;
  reussite?: string;
};

export type Scores = { global: number } & Record<ScoreKey, number>;

/**
 * Le Reboot Score vient uniquement de la question des six notes.
 *
 * Chaque axe est rendu sur 100 pour être lisible d'un coup d'œil, et le global
 * est la moyenne simple des six — aucun axe ne pèse plus qu'un autre, personne
 * n'a à comprendre une pondération.
 *
 * Une note manquante est comptée comme 0 : le formulaire est bloquant, le cas
 * ne devrait pas arriver, mais mieux vaut un score bas qu'un NaN affiché.
 */
export function computeScores(ratings: Partial<Ratings> | undefined): Scores {
  const values = {} as Record<ScoreKey, number>;
  for (const { key } of SCORE_AXES) {
    const raw = ratings?.[key];
    const clamped = typeof raw === "number" ? Math.min(10, Math.max(1, Math.round(raw))) : 0;
    // 1..10 -> 10..100, en gardant 0 pour l'absence de réponse.
    values[key] = clamped === 0 ? 0 : clamped * 10;
  }

  const total = SCORE_AXES.reduce((sum, { key }) => sum + values[key], 0);
  return { global: Math.round(total / SCORE_AXES.length), ...values };
}

/**
 * Lecture du score pour le participant. Le ton compte autant que le chiffre :
 * un score bas doit se lire comme une marge de progression, jamais comme un
 * verdict — c'est précisément la personne qui a le plus à gagner à commencer.
 */
export function readScore(global: number): { title: string; message: string } {
  if (global < 40) {
    return {
      title: "Il était temps",
      message:
        "Votre corps vous envoie des signaux depuis un moment. La bonne nouvelle, c'est que c'est dans cette situation que les premiers résultats se voient le plus vite.",
    };
  }
  if (global < 65) {
    return {
      title: "Des bases à consolider",
      message:
        "Rien n'est cassé, mais plusieurs points tirent votre énergie vers le bas. Sept jours suffisent pour en corriger deux ou trois.",
    };
  }
  if (global < 85) {
    return {
      title: "Un vrai potentiel",
      message:
        "Vous partez avec des acquis solides. On va s'appuyer dessus pour aller chercher ce qui coince encore.",
    };
  }
  return {
    title: "Déjà bien engagé",
    message:
      "Votre état de forme est bon. Ce Reboot servira à structurer ce que vous faites déjà et à passer un cap.",
  };
}

/** L'axe le plus bas — le premier levier à travailler, et à mentionner au client. */
export function weakestAxis(scores: Scores): (typeof SCORE_AXES)[number] {
  return SCORE_AXES.reduce((lowest, axis) =>
    scores[axis.key] < scores[lowest.key] ? axis : lowest
  );
}

/** Vérifie qu'une réponse est fournie pour tout ce qui est obligatoire. */
export function missingAnswers(answers: Answers): string[] {
  const missing: string[] = [];
  for (const question of QUESTIONS) {
    switch (question.kind) {
      case "text": {
        const value = answers[question.id as "bascule"];
        if (!value || !String(value).trim()) missing.push(question.id);
        break;
      }
      case "percent":
        if (typeof answers.batterie !== "number") missing.push(question.id);
        break;
      case "single": {
        const value = answers[question.id as "strategie_15h"];
        if (!value) missing.push(question.id);
        break;
      }
      case "yesno":
        // Le détail reste facultatif, seule la réponse oui/non est exigée.
        if (!answers.entourage?.value) missing.push(question.id);
        break;
      case "ratings": {
        const notes = answers.notes ?? {};
        if (SCORE_AXES.some(({ key }) => typeof notes[key] !== "number")) missing.push(question.id);
        break;
      }
    }
  }
  return missing;
}

/** Libellé lisible d'une réponse à choix, pour l'affichage côté coach. */
export function choiceLabel(questionId: string, value: string | undefined): string {
  if (!value) return "—";
  const question = QUESTIONS.find((q) => q.id === questionId);
  if (!question || question.kind !== "single") return value;
  return question.choices.find((c) => c.value === value)?.label ?? value;
}
