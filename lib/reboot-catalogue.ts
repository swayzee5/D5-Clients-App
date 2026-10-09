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
  sets: number;
  reps: string;
  restSeconds: number;
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
   * Prescription propre à cet exercice.
   *
   * Une vraie séance ne prescrit pas la même chose du premier au dernier
   * mouvement : le tirage lourd en ouverture ne se fait pas en 15
   * répétitions, et le gainage de fin ne se compte pas en séries de 10. Sans
   * ces champs, toute la séance héritait d'un réglage unique, ce qui est le
   * signe qu'elle a été composée par une machine.
   *
   * Laissés vides, les réglages de la séance s'appliquent.
   */
  sets?: number;
  reps?: string;
  restSeconds?: number;
  /** Consigne courte affichée sous l'exercice. */
  notes?: string;
  /**
   * Accepte l'exercice meme sans video.
   *
   * Reserve aux cas ou le coach sait que la video arrive. La regle generale
   * reste qu'un exercice sans demonstration n'entre pas dans une seance : a la
   * maison, sans personne pour corriger, l'image est la seule consigne.
   */
  videoOptional?: boolean;
  /**
   * Identifiant Vimeo imposé, qui l'emporte sur celui de la bibliothèque.
   *
   * Utile quand la bibliothèque attribue la mauvaise vidéo à un exercice et
   * que le coach connaît la bonne : la séance est juste immédiatement, sans
   * attendre le nettoyage de la bibliothèque.
   *
   * C'est un pansement, pas le remède. Tant qu'il est là, cet exercice affiche
   * une autre vidéo dans le Reboot que dans les programmes classiques, qui
   * lisent la bibliothèque. À retirer une fois l'entrée corrigée.
   */
  videoId?: string;
};

/**
 * Dans une seance a liste imposee, une meme video ne sert qu'une fois.
 *
 * La bibliotheque attribue parfois le meme fichier a plusieurs exercices : les
 * pompes classiques, declinees et diamant pointaient toutes les trois vers la
 * video intitulee « Pompes ». Le participant voyait trois vignettes
 * identiques, suivait une demonstration de pompes classiques en croyant faire
 * des pompes diamant, et faisait donc le mauvais exercice en toute confiance.
 *
 * Le premier de la liste garde la video, les suivants s'affichent sans, et le
 * rapport du seed nomme les exercices concernes. Aucun drapeau a ecrire a la
 * main : le jour ou le coach attribue sa propre video a l'exercice, elle
 * reapparait d'elle-meme.
 */

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

/**
 * Les séances, écrites à la main.
 *
 * La sélection automatique par mots-clés produisait des séances plausibles et
 * fausses : « Dos & Biceps » ne contenait que des curls, parce que le mot
 * « curl » est fréquent et que rien ne disait à la machine qu'un dos commence
 * par un tirage. Trouver des exercices pertinents et composer une séance sont
 * deux métiers différents.
 *
 * Chaque séance suit donc trois règles tenues partout :
 *
 *   1. Le mouvement le plus exigeant en premier, quand on est frais, et
 *      l'isolation en dernier. L'inverse donne une séance où l'on finit par
 *      les exercices qui méritaient le plus d'énergie.
 *   2. Les séries baissent et les répétitions montent au fil de la séance, avec
 *      un repos qui raccourcit. Un réglage unique du premier au dernier
 *      exercice est la signature d'une séance produite par une machine.
 *   3. Rien qui demande du matériel absent du lieu. À la maison, pas de barre,
 *      pas de machine ; ce qui exige un élastique le dit dans sa consigne.
 *
 * Le public a entre 40 et 65 ans et a souvent arrêté depuis longtemps. D'où le
 * gobelet plutôt que la barre, les fentes plutôt que les sauts, et des
 * amplitudes annoncées plutôt que des charges.
 *
 * Les noms sont ceux de la bibliothèque, au caractère près. Un nom qui n'y
 * correspond pas est signalé par le rapport du seed, jamais silencieux.
 */
type SeanceEcrite = {
  slug: string;
  tab: "salle" | "maison";
  muscleGroup: string;
  name: string;
  description: string;
  durationMinutes: number;
  exercices: PinnedExercise[];
};

const SEANCES: SeanceEcrite[] = [
  // ── EN SALLE ──────────────────────────────────────────────────────────
  {
    slug: "salle-pecs",
    tab: "salle",
    muscleGroup: "pecs",
    name: "Pectoraux",
    description: "Poitrine, épaules avant et triceps.",
    durationMinutes: 50,
    exercices: [
      { name: "Développé couché haltères", sets: 4, reps: "8-10", restSeconds: 90, notes: "Descente lente, les coudes à 45° du buste." },
      { name: "Développé incliné haltères", sets: 3, reps: "10", restSeconds: 90 },
      { name: "Écarté couché haltères", sets: 3, reps: "12", restSeconds: 60, notes: "Bras légèrement fléchis, on cherche l'étirement." },
      { name: "Peck deck machine", sets: 3, reps: "15", restSeconds: 60 },
      { name: "Pompes inclinées", sets: 2, reps: "maximum", restSeconds: 60, notes: "Mains sur un banc, pour finir sans charge." },
    ],
  },
  {
    slug: "salle-dos",
    tab: "salle",
    muscleGroup: "dos",
    name: "Dos & Biceps",
    description: "Grand dorsal, milieu du dos, puis biceps en finition.",
    durationMinutes: 50,
    exercices: [
      { name: "Tirage vertical prise large", sets: 4, reps: "10", restSeconds: 90, notes: "Tirer avec les coudes, pas avec les mains." },
      { name: "Rowing haltère unilatéral", sets: 3, reps: "10 par bras", restSeconds: 75 },
      { name: "Rowing câble assis", sets: 3, reps: "12", restSeconds: 75, notes: "Buste droit, sans balancer." },
      { name: "Face pull", sets: 3, reps: "15", restSeconds: 60 },
      { name: "Curl barre EZ", sets: 3, reps: "10", restSeconds: 60 },
      { name: "Curl marteau", sets: 3, reps: "12", restSeconds: 60 },
    ],
  },
  {
    slug: "salle-epaules",
    tab: "salle",
    muscleGroup: "epaules",
    name: "Épaules",
    description: "Les trois faisceaux, et la coiffe pour finir.",
    durationMinutes: 45,
    exercices: [
      { name: "Développé militaire haltères", sets: 4, reps: "8-10", restSeconds: 90 },
      { name: "Élévations latérales haltères", sets: 3, reps: "12-15", restSeconds: 60, notes: "Léger. Monter à hauteur d'épaule, pas plus haut." },
      { name: "Oiseau haltères", sets: 3, reps: "15", restSeconds: 60 },
      { name: "Face pull", sets: 3, reps: "15", restSeconds: 60 },
      { name: "Shrugs haltères", sets: 3, reps: "12", restSeconds: 60 },
      { name: "Rotation externe élastique", sets: 2, reps: "15 par bras", restSeconds: 45, notes: "Prévention. Très léger, coude collé au corps." },
    ],
  },
  {
    slug: "salle-bras",
    tab: "salle",
    muscleGroup: "bras",
    name: "Bras",
    description: "Biceps et triceps en alternance.",
    durationMinutes: 40,
    exercices: [
      { name: "Curl barre EZ", sets: 4, reps: "10", restSeconds: 75 },
      { name: "Dips triceps aux barres", sets: 3, reps: "8-10", restSeconds: 75, notes: "Buste vertical. Machine d'assistance ou pieds au sol si besoin." },
      { name: "Curl incliné haltères", sets: 3, reps: "12", restSeconds: 60 },
      { name: "Extensions triceps câble corde", sets: 3, reps: "12", restSeconds: 60 },
      { name: "Curl marteau", sets: 3, reps: "12", restSeconds: 45 },
      { name: "Kick-back haltères", sets: 3, reps: "15 par bras", restSeconds: 45 },
    ],
  },
  {
    slug: "salle-jambes",
    tab: "salle",
    muscleGroup: "jambes",
    name: "Jambes & Fessiers",
    description: "Cuisses, fessiers, ischio-jambiers et mollets.",
    durationMinutes: 55,
    exercices: [
      { name: "Squat gobelet", sets: 4, reps: "10", restSeconds: 90, notes: "Un haltère contre la poitrine. Descendre autant que les genoux le permettent." },
      { name: "Leg press", sets: 3, reps: "12", restSeconds: 90 },
      { name: "Deadlift roumain haltères", sets: 3, reps: "10", restSeconds: 90, notes: "Dos plat, hanches en arrière, jambes presque tendues." },
      { name: "Fentes arrière haltères", sets: 3, reps: "10 par jambe", restSeconds: 75 },
      { name: "Leg curl couché machine", sets: 3, reps: "12", restSeconds: 60 },
      { name: "Mollets debout machine", sets: 3, reps: "15", restSeconds: 45 },
    ],
  },
  {
    slug: "salle-haut",
    tab: "salle",
    muscleGroup: "haut",
    name: "Haut du corps",
    description: "Pousser, tirer, et finir par les bras. Tout le haut en une séance.",
    durationMinutes: 50,
    exercices: [
      { name: "Développé couché haltères", sets: 4, reps: "10", restSeconds: 90 },
      { name: "Tirage vertical prise large", sets: 4, reps: "10", restSeconds: 90 },
      { name: "Développé militaire haltères", sets: 3, reps: "10", restSeconds: 75 },
      { name: "Rowing câble assis", sets: 3, reps: "12", restSeconds: 75 },
      { name: "Curl haltères alternés", sets: 3, reps: "12", restSeconds: 60 },
      { name: "Extensions triceps câble corde", sets: 3, reps: "12", restSeconds: 60 },
    ],
  },
  {
    slug: "salle-fullbody",
    tab: "salle",
    muscleGroup: "fullbody",
    name: "Full Body",
    description: "Un mouvement par grande fonction : pousser, tirer, s'accroupir, charnière de hanche.",
    durationMinutes: 50,
    exercices: [
      { name: "Squat gobelet", sets: 3, reps: "10", restSeconds: 90 },
      { name: "Développé couché haltères", sets: 3, reps: "10", restSeconds: 90 },
      { name: "Tirage vertical prise large", sets: 3, reps: "10", restSeconds: 90 },
      { name: "Deadlift roumain haltères", sets: 3, reps: "10", restSeconds: 90 },
      { name: "Développé militaire haltères", sets: 3, reps: "12", restSeconds: 60 },
      { name: "Planche", sets: 3, reps: "40 secondes", restSeconds: 45 },
    ],
  },
  {
    slug: "salle-gainage",
    tab: "salle",
    muscleGroup: "gainage",
    name: "Gainage & Abdominaux",
    description: "Sangle abdominale, obliques et bas du dos. Tenir, pas se tordre.",
    durationMinutes: 35,
    exercices: [
      { name: "Planche", sets: 3, reps: "45 secondes", restSeconds: 45, notes: "Fessiers serrés, ne pas creuser le bas du dos." },
      { name: "Dead bug", sets: 3, reps: "10 par côté", restSeconds: 45 },
      { name: "Pallof press", sets: 3, reps: "12 par côté", restSeconds: 45, notes: "Au câble ou à l'élastique. Résister à la rotation." },
      { name: "Crunch câble", sets: 3, reps: "15", restSeconds: 45 },
      { name: "Planche latérale", sets: 3, reps: "30 secondes par côté", restSeconds: 45 },
      { name: "Bird dog", sets: 3, reps: "10 par côté", restSeconds: 30 },
    ],
  },
  {
    slug: "salle-cardio",
    tab: "salle",
    muscleGroup: "cardio",
    name: "Cardio & Mobilité",
    description: "Monter le cardiaque sans impact, puis rouvrir les hanches et le dos.",
    durationMinutes: 40,
    exercices: [
      { name: "Vélo stationnaire", sets: 1, reps: "12 minutes", restSeconds: 60, notes: "Rythme où l'on peut encore parler, pas chanter." },
      { name: "Jumping jack", sets: 3, reps: "45 secondes", restSeconds: 45 },
      { name: "Mountain climber", sets: 3, reps: "30 secondes", restSeconds: 45 },
      { name: "Worlds greatest stretch", sets: 2, reps: "5 par côté", restSeconds: 30 },
      { name: "Cat-cow", sets: 2, reps: "10", restSeconds: 30 },
    ],
  },

  // ── À LA MAISON ───────────────────────────────────────────────────────
  {
    slug: "maison-pecs",
    tab: "maison",
    muscleGroup: "pecs",
    name: "Pectoraux",
    description: "Quatre angles de pompes, du plus accessible au plus dur.",
    durationMinutes: 35,
    exercices: [
      { name: "Pompes inclinées", sets: 4, reps: "12-15", restSeconds: 60, notes: "Mains sur une table ou un plan de travail." },
      { name: "Pompes classiques", sets: 3, reps: "10-12", restSeconds: 60 },
      { name: "Pompes déclinées", sets: 3, reps: "8-10", restSeconds: 60, notes: "Pieds sur une chaise.", videoId: "1229824025" },
      { name: "Pompes diamant", sets: 3, reps: "8", restSeconds: 60, notes: "Mains en triangle sous la poitrine.", videoOptional: true },
      { name: "Dips banc", sets: 3, reps: "12", restSeconds: 45, notes: "Mains sur une chaise stable, dos près du bord." },
    ],
  },
  {
    slug: "maison-dos",
    tab: "maison",
    muscleGroup: "dos",
    name: "Dos",
    description: "Sans barre de traction, le dos se travaille au sol et à l'élastique.",
    durationMinutes: 35,
    exercices: [
      { name: "Superman", sets: 3, reps: "12", restSeconds: 45, notes: "Au sol, lever bras et jambes sans forcer la nuque." },
      { name: "Prone Y T W", sets: 3, reps: "8 de chaque", restSeconds: 45 },
      { name: "Banded pull-apart", sets: 3, reps: "15", restSeconds: 45, notes: "Avec un élastique. Sans élastique, enchaîne les Superman." },
      { name: "Face pull léger élastique", sets: 3, reps: "15", restSeconds: 45 },
      { name: "Scapular push-up", sets: 3, reps: "10", restSeconds: 45, notes: "En position de pompe, bras tendus : seules les omoplates bougent." },
      { name: "Bird dog", sets: 3, reps: "10 par côté", restSeconds: 30 },
    ],
  },
  {
    slug: "maison-epaules",
    tab: "maison",
    muscleGroup: "epaules",
    name: "Épaules",
    description: "Pousser au poids du corps, puis l'élastique pour le détail.",
    durationMinutes: 30,
    exercices: [
      { name: "Pompes inclinées", sets: 4, reps: "12", restSeconds: 60 },
      { name: "Élévation latérale légère", sets: 3, reps: "15", restSeconds: 45, notes: "Deux bouteilles d'eau font l'affaire." },
      { name: "Banded pull-apart", sets: 3, reps: "15", restSeconds: 45 },
      { name: "Prone Y T W", sets: 3, reps: "8 de chaque", restSeconds: 45 },
      { name: "Rotation externe élastique", sets: 3, reps: "15 par bras", restSeconds: 45 },
    ],
  },
  {
    slug: "maison-jambes",
    tab: "maison",
    muscleGroup: "jambes",
    name: "Jambes & Fessiers",
    description: "Cuisses et fessiers au poids du corps, sans matériel.",
    durationMinutes: 35,
    exercices: [
      { name: "Fentes marchées", sets: 3, reps: "10 par jambe", restSeconds: 60 },
      { name: "Squat pulse", sets: 3, reps: "15", restSeconds: 60, notes: "Descendre à mi-hauteur et rebondir sans se relever." },
      { name: "Step-up", sets: 3, reps: "12 par jambe", restSeconds: 60, notes: "Sur une marche d'escalier." },
      { name: "Glute bridge", sets: 3, reps: "15", restSeconds: 45 },
      { name: "Fentes latérales", sets: 3, reps: "10 par côté", restSeconds: 45 },
      { name: "Mollets sur marche", sets: 3, reps: "15", restSeconds: 45 },
    ],
  },
  {
    slug: "maison-haut",
    tab: "maison",
    muscleGroup: "haut",
    name: "Haut du corps",
    description: "Pousser et tirer, sans rien d'autre que le sol et une chaise.",
    durationMinutes: 35,
    exercices: [
      { name: "Pompes inclinées", sets: 3, reps: "12", restSeconds: 60 },
      { name: "Superman", sets: 3, reps: "12", restSeconds: 45 },
      { name: "Dips banc", sets: 3, reps: "12", restSeconds: 60 },
      { name: "Banded pull-apart", sets: 3, reps: "15", restSeconds: 45 },
      { name: "Élévation latérale légère", sets: 3, reps: "15", restSeconds: 45 },
      { name: "Scapular push-up", sets: 3, reps: "10", restSeconds: 45 },
    ],
  },
  {
    slug: "maison-fullbody",
    tab: "maison",
    muscleGroup: "fullbody",
    name: "Full Body",
    description: "Le corps entier, sans matériel, en trente minutes.",
    durationMinutes: 35,
    exercices: [
      { name: "Fentes marchées", sets: 3, reps: "10 par jambe", restSeconds: 60 },
      { name: "Pompes inclinées", sets: 3, reps: "12", restSeconds: 60 },
      { name: "Glute bridge", sets: 3, reps: "15", restSeconds: 45 },
      { name: "Superman", sets: 3, reps: "12", restSeconds: 45 },
      { name: "Planche", sets: 3, reps: "40 secondes", restSeconds: 45 },
      { name: "Jumping jack", sets: 3, reps: "45 secondes", restSeconds: 45 },
    ],
  },
  {
    slug: "maison-gainage",
    tab: "maison",
    muscleGroup: "gainage",
    name: "Gainage & Abdominaux",
    description: "Tenir la position plutôt que multiplier les crunchs.",
    durationMinutes: 30,
    exercices: [
      { name: "Planche", sets: 3, reps: "40 secondes", restSeconds: 45, notes: "Fessiers serrés, ne pas creuser le bas du dos." },
      { name: "Dead bug", sets: 3, reps: "10 par côté", restSeconds: 45 },
      { name: "Crunch inversé", sets: 3, reps: "12", restSeconds: 45 },
      { name: "Planche latérale", sets: 3, reps: "30 secondes par côté", restSeconds: 45 },
      { name: "Bicycle crunch", sets: 3, reps: "20", restSeconds: 45 },
      { name: "Bird dog", sets: 3, reps: "10 par côté", restSeconds: 30 },
    ],
  },
  {
    slug: "maison-cardio",
    tab: "maison",
    muscleGroup: "cardio",
    name: "Cardio & Mobilité",
    description: "Faire monter le cœur dans un salon, puis rouvrir les hanches.",
    durationMinutes: 30,
    exercices: [
      { name: "Jumping jack", sets: 4, reps: "45 secondes", restSeconds: 45 },
      { name: "High knees", sets: 3, reps: "30 secondes", restSeconds: 45 },
      { name: "Mountain climber", sets: 3, reps: "30 secondes", restSeconds: 45 },
      { name: "Inchworm", sets: 3, reps: "8", restSeconds: 45 },
      { name: "Worlds greatest stretch", sets: 2, reps: "5 par côté", restSeconds: 30 },
      { name: "Cat-cow", sets: 2, reps: "10", restSeconds: 30 },
    ],
  },
];

/**
 * Les réglages de séance ne servent plus que de repli : chaque exercice porte
 * les siens. Ils restent définis pour qu'un exercice ajouté sans prescription
 * ne se retrouve pas sans rien.
 */
export const STRENGTH_SESSIONS: StrengthDef[] = SEANCES.map((s) => ({
  slug: s.slug,
  tab: s.tab,
  muscleGroup: s.muscleGroup,
  name: s.name,
  description: s.description,
  durationMinutes: s.durationMinutes,
  sets: 3,
  reps: "12",
  restSeconds: 60,
  pinned: s.exercices,
}));

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

/** Les onglets ne comptant pas dans l'objectif de 3 séances du challenge. */
export function isBonusTab(tab: RebootTab): boolean {
  return tab === "mobilite" || tab === "hiit";
}
