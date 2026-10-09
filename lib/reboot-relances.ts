/**
 * Les relances du challenge, calées sur la date de départ de la cohorte.
 *
 * Pourquoi la date de la cohorte et non celle du compte : le coach crée les
 * comptes le week-end pour un challenge qui démarre le lundi. Compter depuis
 * la création enverrait « fais ta première séance » un samedi soir, avant que
 * le challenge ait commencé. Et compter depuis la première connexion ne
 * relancerait jamais ceux qui ne se connectent pas — précisément ceux qu'il
 * faut relancer.
 *
 * Une seule date, la même pour tout le groupe, et tout en découle. Un
 * retardataire peut recevoir sa propre date : la colonne est par client.
 *
 * Le coach raisonne en jours de la semaine, le code en jours écoulés. Les deux
 * coïncident tant que la cohorte démarre un lundi, ce qui est le cas.
 */

export type Relance = {
  /** Jour écoulé depuis le départ : 0 = le lundi du lancement. */
  jour: number;
  /** Identifiant stable, utilisé pour ne jamais envoyer deux fois. */
  cle: "j1" | "j3" | "j7" | "j8";
  titre: string;
  message: string;
  chemin: string;
  /** Ce qui doit manquer pour que la relance parte. */
  condition: "aucune_action" | "mini_point" | "bilan";
};

export const RELANCES: Relance[] = [
  {
    jour: 0,
    cle: "j1",
    titre: "On commence ?",
    message: "Ta première séance t'attend. 30 minutes, et le plus dur est derrière toi.",
    chemin: "/reboot/seances",
    condition: "aucune_action",
  },
  {
    jour: 2,
    cle: "j3",
    titre: "Deux minutes pour faire le point",
    message: "Dis-moi où tu en es, et ce qui coince s'il y a quelque chose.",
    chemin: "/reboot/point",
    condition: "mini_point",
  },
  {
    jour: 6,
    cle: "j7",
    titre: "Ton bilan de la semaine",
    message: "Les 6 mêmes notes qu'au départ, pour voir ce qui a changé.",
    chemin: "/reboot/bilan",
    condition: "bilan",
  },
  {
    jour: 7,
    cle: "j8",
    titre: "Ton bilan est toujours ouvert",
    message: "Cinq minutes, et tu sauras exactement ce que cette semaine t'a apporté.",
    chemin: "/reboot/bilan",
    condition: "bilan",
  },
];

/** Jours écoulés entre deux dates, sans tenir compte de l'heure. */
export function joursEcoules(depart: Date, aujourdhui: Date): number {
  const d = Date.UTC(depart.getUTCFullYear(), depart.getUTCMonth(), depart.getUTCDate());
  const a = Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth(), aujourdhui.getUTCDate());
  return Math.round((a - d) / 86_400_000);
}

/** La relance attendue aujourd'hui pour une date de départ donnée, s'il y en a une. */
export function relanceDuJour(depart: Date, aujourdhui: Date): Relance | null {
  const jour = joursEcoules(depart, aujourdhui);
  return RELANCES.find((r) => r.jour === jour) ?? null;
}

/**
 * Identifiant d'envoi, unique par participant et par échéance.
 *
 * La date de départ entre dans la clé : un même participant qui referait le
 * challenge un autre mois doit pouvoir recevoir à nouveau ses relances, alors
 * qu'une clé réduite à « j3 » le lui interdirait pour toujours.
 */
export function cleEnvoi(relance: Relance, depart: Date): string {
  const jour = depart.toISOString().slice(0, 10);
  return `reboot_${relance.cle}_${jour}`;
}
