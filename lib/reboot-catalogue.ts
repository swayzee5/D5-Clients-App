/**
 * Catalogue des séances Reboot 40.
 *
 * Source de vérité unique : la route de seed construit la base à partir de ce
 * fichier, et l'app affiche exactement ce que le seed a produit.
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * L'ancien seed copiait chaque séance Reboot depuis un modèle du CRM en le
 * cherchant par son nom exact (« Séance Pectoraux », « Séance Dos »…). Ces
 * modèles ne portent pas ces noms : le CRM les appelle « Pecs — Salle »,
 * « Dos — Maison »… La recherche ne trouvait donc rien, mais la séance Reboot
 * était créée quand même — vide. Et comme le seed saute les séances qui
 * existent déjà, une séance née vide le restait pour toujours.
 *
 * Deux conséquences pour le participant : une séance listée, cliquable, et sans
 * un seul exercice ; et des exercices sans vidéo quand le nom ne correspondait
 * pas à la bibliothèque.
 *
 * D'où deux choix ici :
 *
 *   1. Les exercices sont piochés DIRECTEMENT dans exercise_library, et
 *      uniquement parmi ceux qui ont une vidéo. Plus d'intermédiaire à nommer
 *      exactement, et « pas de vidéo » devient impossible par construction.
 *
 *   2. Chaque entrée porte un `slug` stable. C'est lui qui identifie la séance
 *      d'un seed à l'autre, ce qui permet de compléter une séance trop maigre
 *      au lieu de la sauter.
 *
 * Le genre n'apparaît nulle part : les séances sont les mêmes pour tout le
 * monde, seul le lieu (salle ou maison) les distingue.
 */

export type RebootTab = "salle" | "maison" | "mobilite" | "hiit";

export const TABS: { key: RebootTab; label: string; hint: string }[] = [
  { key: "salle", label: "En salle", hint: "Avec machines et charges" },
  { key: "maison", label: "À la maison", hint: "Sans matériel" },
  { key: "mobilite", label: "Échauffements", hint: "Et étirements" },
  { key: "hiit", label: "HIIT", hint: "Séances vidéo à suivre" },
];

/** Une séance de renforcement, composée depuis la bibliothèque d'exercices. */
export type StrengthDef = {
  slug: string;
  tab: "salle" | "maison";
  muscleGroup: string;
  name: string;
  description: string;
  durationMinutes: number;
  /** Mots-clés cherchés dans exercise_library.muscles. */
  muscles: string[];
  /** Repli cherché dans exercise_library.name quand les muscles sont mal tagués. */
  nameKeywords: string[];
  sets: number;
  reps: string;
  restSeconds: number;
  /** Nombre d'exercices visé, quand la sélection est automatique. */
  target: number;
  /**
   * Liste imposée par le coach, dans cet ordre, qui remplace entièrement la
   * sélection automatique.
   *
   * La sélection par mots-clés fait au mieux avec ce que la bibliothèque
   * contient ; elle ne sait pas qu'une démonstration est mal filmée, ni qu'un
   * exercice n'a pas sa place dans une séance à la maison. Quand le coach a
   * tranché, on n'a plus rien à deviner.
   *
   * Les noms sont ceux de exercise_library, compares sans tenir compte de la
   * casse ni des espaces autour. Un nom introuvable est signale dans le
   * rapport du seed plutot qu'ignore en silence.
   */
  pinned?: PinnedExercise[];
};

export type PinnedExercise = {
  /** Nom exact dans exercise_library. */
  name: string;
  /**
   * Accepte l'exercice meme sans video.
   *
   * Reserve aux cas ou le coach sait que la video arrive. La regle generale
   * reste qu'un exercice sans demonstration n'entre pas dans une seance : a la
   * maison, sans personne pour corriger, l'image est la seule consigne.
   */
  videoOptional?: boolean;
};

/** Une vidéo à suivre telle quelle : échauffement, étirement ou HIIT. */
export type VideoDef = {
  slug: string;
  tab: "mobilite" | "hiit";
  name: string;
  description: string;
  durationMinutes: number;
  /**
   * Fragments cherchés à la suite dans le nom de la vidéo, dans cet ordre.
   *
   * Découpés pour ne contenir aucune lettre accentuée : la base n'a pas
   * l'extension unaccent, et « Échauffement » s'écrit tantôt avec majuscule
   * accentuée, tantôt sans. Chercher « chauffement » puis « full body » puis
   * « 1 » trouve la vidéo quelle que soit l'orthographe exacte du début.
   */
  match: string[];
  /** Consigne affichée à la place des séries/répétitions. */
  instruction: string;
};

/** Dédoublonne. La cible TypeScript du projet est ES5 : pas d'itération de Set. */
function unique(values: string[]): string[] {
  return values.filter((v, i) => values.indexOf(v) === i);
}

// ── Groupes musculaires ────────────────────────────────────────────────────
// Les tags `muscles` de la bibliothèque sont inégalement remplis, d'où le
// doublon systématique entre mots-clés de muscle et mots-clés de nom.

// Des radicaux, pas des mots entiers : les tags sont au pluriel dans la
// bibliothèque (« Pectoraux », « Mollets », « Fessiers »), et chercher
// « pectoral » ne trouve pas « Pectoraux ». Le piège est silencieux — la
// sélection basculait sur le repli par nom, ce qui faisait entrer un
// « Développé militaire » dans la séance pectoraux.
const PECS_M = ["pectora", "pecs", "poitrine", "chest"];
const DOS_M = ["dos", "dorsal", "latissimus", "trapèz", "trapez", "rhombo"];
const EPAULES_M = ["épaule", "epaule", "deltoï", "deltoi", "delta", "shoulder"];
const BRAS_M = ["biceps", "triceps", "avant-bras", "brachial"];
const JAMBES_M = [
  "quadriceps", "quads", "ischio", "fémor", "femor",
  "fessier", "glute", "mollet", "jambe", "adducteur",
];
const GAINAGE_M = ["abdo", "core", "gainage", "oblique", "transverse", "lombaire"];
const CARDIO_M = ["cardio", "mobilit", "souplesse", "étirement", "etirement"];
const FULL_M = unique([...PECS_M, ...DOS_M, ...EPAULES_M, ...JAMBES_M]);

const PECS_N = ["développé", "developpe", "écarté", "ecarte", "pompe", "dips", "peck deck", "pull-over"];
const DOS_N = ["tirage", "rowing", "traction", "shrug", "hyperextension", "superman", "deadlift", "soulevé"];
const EPAULES_N = ["militaire", "élévation", "elevation", "oiseau", "arnold", "upright", "rotation externe"];
const BRAS_N = ["curl", "extension", "kickback", "dips", "barre au front", "poignet"];
const JAMBES_N = [
  "squat", "fente", "presse", "leg", "mollet", "soulevé de terre",
  "roumain", "pont fessier", "hip thrust", "chaise", "montée",
];
const GAINAGE_N = ["planche", "gainage", "crunch", "relevé de jambes", "russian twist", "mountain climber", "abdo"];
const CARDIO_N = ["marche", "course", "vélo", "velo", "rameur", "corde", "burpee", "jumping", "escalier", "étirement", "etirement"];
const FULL_N = unique([...PECS_N, ...DOS_N, ...EPAULES_N, ...JAMBES_N]);

/**
 * Marqueurs de matériel de salle, exclus des séances « à la maison ».
 *
 * La bibliothèque n'a pas de colonne matériel : seul le nom de l'exercice
 * renseigne sur ce qu'il faut. On raisonne donc par exclusion — tout ce qui ne
 * nomme aucune machine reste faisable à la maison. L'inverse (lister ce qui est
 * faisable sans matériel) laisserait passer des trous, parce qu'il faudrait
 * avoir prévu chaque nom à l'avance.
 */
export const GYM_ONLY_MARKERS = [
  "machine", "câble", "cable", "poulie", "smith", "barre", "presse",
  "tirage", "banc", "haltère", "haltere", "peck deck", "leg curl",
  "leg extension", "butterfly", "hack", "rameur", "vélo", "velo",
  "elliptique", "tapis",
];

/**
 * Entrées de la bibliothèque qui décrivent une séance ou un programme entier
 * plutôt qu'un exercice. Elles n'ont rien à faire dans une liste d'exercices.
 */
export const NOT_AN_EXERCISE_MARKERS = ["(seance)", "(séance)", "(programme)"];

const SALLE_GROUPS: Omit<StrengthDef, "slug" | "tab" | "durationMinutes" | "sets" | "reps" | "restSeconds" | "target">[] = [
  { muscleGroup: "pecs", name: "Pectoraux", description: "Poitrine, épaules et triceps.", muscles: PECS_M, nameKeywords: PECS_N },
  { muscleGroup: "dos", name: "Dos & Biceps", description: "Grand dorsal, trapèzes et biceps.", muscles: [...DOS_M, "biceps"], nameKeywords: [...DOS_N, "curl"] },
  { muscleGroup: "epaules", name: "Épaules", description: "Deltoïdes, trapèzes et rotateurs.", muscles: EPAULES_M, nameKeywords: EPAULES_N },
  { muscleGroup: "bras", name: "Bras", description: "Biceps, triceps et avant-bras.", muscles: BRAS_M, nameKeywords: BRAS_N },
  { muscleGroup: "jambes", name: "Jambes & Fessiers", description: "Cuisses, ischio-jambiers, fessiers et mollets.", muscles: JAMBES_M, nameKeywords: JAMBES_N },
  { muscleGroup: "haut", name: "Haut du corps", description: "Pectoraux, dos, épaules et bras en une séance.", muscles: [...PECS_M, ...DOS_M, ...EPAULES_M, ...BRAS_M], nameKeywords: [...PECS_N, ...DOS_N, ...EPAULES_N, ...BRAS_N] },
  { muscleGroup: "fullbody", name: "Full Body", description: "Le corps entier en une séance.", muscles: FULL_M, nameKeywords: FULL_N },
  { muscleGroup: "gainage", name: "Gainage & Abdominaux", description: "Sangle abdominale, stabilité et bas du dos.", muscles: GAINAGE_M, nameKeywords: GAINAGE_N },
  { muscleGroup: "cardio", name: "Cardio & Mobilité", description: "Endurance douce, souplesse et récupération.", muscles: CARDIO_M, nameKeywords: CARDIO_N },
];

/**
 * Séances dont le contenu est fixé à la main par le coach.
 *
 * Pectoraux maison a été refaite ainsi : des participants ont signalé de
 * mauvaises démonstrations. La sélection automatique fait au mieux avec les
 * mots-clés, mais elle ne sait pas qu'une vidéo est ratée, ni qu'un exercice
 * n'a pas sa place à la maison. Quand le coach a tranché, il n'y a plus rien à
 * deviner, et l'ordre affiché est le sien.
 *
 * « Pompes » attend encore sa vidéo, et passe quand même : le coach la tourne
 * dans la journée. Dès qu'elle sera dans la bibliothèque, un nouvel appel du
 * seed la rattachera sans rien changer d'autre. C'est la seule exception à la
 * règle du « pas de démonstration, pas d'exercice ».
 */
const PINNED: Record<string, PinnedExercise[] | undefined> = {
  "maison-pecs": [
    { name: "Pompes inclinées" },
    { name: "Pompes classiques" },
    { name: "Pompes déclinées" },
    { name: "Pompes diamant" },
    { name: "Pompes", videoOptional: true },
  ],
};

/**
 * Les mêmes groupes en salle et à la maison. Les séries et la récupération
 * diffèrent : sans charge, on compense par des répétitions plus nombreuses et
 * une récupération plus courte.
 */
export const STRENGTH_SESSIONS: StrengthDef[] = [
  ...SALLE_GROUPS.map((g) => ({
    ...g,
    slug: `salle-${g.muscleGroup}`,
    tab: "salle" as const,
    durationMinutes: 50,
    sets: 4,
    reps: "10-12",
    restSeconds: 90,
    target: 6,
  })),
  ...SALLE_GROUPS.map((g) => ({
    ...g,
    slug: `maison-${g.muscleGroup}`,
    tab: "maison" as const,
    durationMinutes: 40,
    sets: 3,
    reps: "12-15",
    restSeconds: 60,
    target: 6,
    pinned: PINNED[`maison-${g.muscleGroup}`],
  })),
];


export const VIDEO_SESSIONS: VideoDef[] = [
  {
    slug: "mob-echauffement-full-body-1",
    tab: "mobilite",
    name: "Échauffement full body 1",
    description: "À faire avant une séance qui travaille tout le corps.",
    durationMinutes: 8,
    match: ["chauffement", "full body", "1"],
    instruction: "Suivre la vidéo en entier",
  },
  {
    slug: "mob-echauffement-full-body-2",
    tab: "mobilite",
    name: "Échauffement full body 2",
    description: "Une autre version, pour varier.",
    durationMinutes: 8,
    match: ["chauffement", "full body", "2"],
    instruction: "Suivre la vidéo en entier",
  },
  {
    slug: "mob-echauffement-full-body-3",
    tab: "mobilite",
    name: "Échauffement full body 3",
    description: "Une troisième version, pour varier encore.",
    durationMinutes: 8,
    match: ["chauffement", "full body", "3"],
    instruction: "Suivre la vidéo en entier",
  },
  {
    slug: "mob-echauffement-haut-du-corps",
    tab: "mobilite",
    name: "Échauffement haut du corps",
    description: "Avant une séance pectoraux, dos, épaules ou bras.",
    durationMinutes: 7,
    match: ["chauffement", "haut du corps"],
    instruction: "Suivre la vidéo en entier",
  },
  {
    slug: "mob-echauffement-bas-du-corps",
    tab: "mobilite",
    name: "Échauffement bas du corps",
    description: "Avant une séance jambes et fessiers.",
    durationMinutes: 7,
    match: ["chauffement", "bas du corps"],
    instruction: "Suivre la vidéo en entier",
  },
  {
    slug: "mob-etirements-1",
    tab: "mobilite",
    name: "Étirements fin de séance 1",
    description: "Juste après l'effort, pour récupérer plus vite.",
    durationMinutes: 10,
    match: ["tirement", "fin de s", "1"],
    instruction: "Suivre la vidéo en entier",
  },
  {
    slug: "mob-etirements-2",
    tab: "mobilite",
    name: "Étirements fin de séance 2",
    description: "Une autre version, pour varier.",
    durationMinutes: 10,
    match: ["tirement", "fin de s", "2"],
    instruction: "Suivre la vidéo en entier",
  },
  {
    slug: "hiit-maison-1",
    tab: "hiit",
    name: "HIIT Maison 1",
    description: "Court, intense, sans matériel.",
    durationMinutes: 20,
    match: ["hiit", "maison", "1"],
    instruction: "Suivre la vidéo en entier",
  },
  {
    slug: "hiit-maison-2",
    tab: "hiit",
    name: "HIIT Maison 2",
    description: "Court, intense, sans matériel.",
    durationMinutes: 20,
    match: ["hiit", "maison", "2"],
    instruction: "Suivre la vidéo en entier",
  },
  {
    slug: "hiit-maison-3",
    tab: "hiit",
    name: "HIIT Maison 3",
    description: "Court, intense, sans matériel.",
    durationMinutes: 20,
    match: ["hiit", "maison", "3"],
    instruction: "Suivre la vidéo en entier",
  },
];

/** Tous les slugs du catalogue : ce qui n'y figure pas doit être désactivé. */
export const ALL_SLUGS = [
  ...STRENGTH_SESSIONS.map((s) => s.slug),
  ...VIDEO_SESSIONS.map((s) => s.slug),
];

/**
 * En dessous de ce nombre d'exercices, une séance de renforcement n'est pas
 * publiée. Mieux vaut une séance absente qu'une séance qui s'ouvre sur deux
 * exercices et laisse croire que c'est tout le programme.
 */
export const MIN_EXERCISES = 4;

/** Les onglets ne comptant pas dans l'objectif de 3 séances du challenge. */
export function isBonusTab(tab: RebootTab): boolean {
  return tab === "mobilite" || tab === "hiit";
}
