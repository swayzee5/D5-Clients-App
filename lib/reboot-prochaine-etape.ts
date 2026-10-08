/**
 * Quelle est la seule chose à faire maintenant ?
 *
 * La page du challenge affiche quatre onglets de séances, trois cartes de
 * messages, quatre modules, un bilan et un certificat. Tout y est, et c'est
 * précisément le problème : le participant doit deviner par où commencer, à
 * chaque ouverture, pendant sept jours.
 *
 * Une seule action nommée en haut de page supprime cette décision. Le reste
 * n'est pas caché, il est seulement rangé en dessous.
 *
 * L'ordre suit les dépendances réelles du challenge : un message ne se poste
 * qu'après une séance, et le bilan n'a de sens qu'une fois les dix étapes
 * faites. Entre deux actions également disponibles, la séance passe devant —
 * c'est elle qui demande de s'y mettre, les modules se lisent dans le train.
 */

export type ProchaineEtape = {
  emoji: string;
  titre: string;
  detail: string;
  href: string;
};

export function prochaineEtape({
  seances,
  messages,
  modules,
  bilanFait,
  premierModuleAFaire,
}: {
  seances: number;
  messages: number;
  modules: number;
  bilanFait: boolean;
  /** Clé du premier module non validé, pour y aller directement. */
  premierModuleAFaire: string | null;
}): ProchaineEtape {
  // Le message dû passe avant la séance suivante. Il se rattache à la séance
  // qu'on vient de finir : repoussé d'un jour, il n'est jamais posté, et c'est
  // le point que les participants perdaient le plus souvent.
  if (messages < Math.min(seances, 3)) {
    return {
      emoji: "💬",
      titre: `Ton message ${messages + 1} sur 3`,
      detail: "Poste-le dans le groupe, les autres l'attendent.",
      href: "/reboot#messages",
    };
  }

  if (seances < 3) {
    return {
      emoji: "🏋️",
      titre: seances === 0 ? "Ta première séance" : `Ta séance ${seances + 1} sur 3`,
      detail: "En salle ou à la maison, avec la vidéo de chaque exercice.",
      href: "/reboot#seances",
    };
  }

  if (modules < 4 && premierModuleAFaire) {
    return {
      emoji: "📚",
      titre: `Ton module ${modules + 1} sur 4`,
      detail: "Deux minutes de lecture.",
      href: `/reboot/module/${premierModuleAFaire}`,
    };
  }

  if (!bilanFait) {
    return {
      emoji: "📈",
      titre: "Ton bilan de fin",
      detail: "Les 6 mêmes notes qu'au départ, pour voir ce qui a changé.",
      href: "/reboot/bilan",
    };
  }

  return {
    emoji: "🏅",
    titre: "Ton certificat",
    detail: "Tout est terminé. Télécharge-le.",
    href: "/reboot/certificat",
  };
}
