/**
 * Le lien que les participants envoient à leurs proches.
 *
 * Absolu, parce qu'il est collé dans WhatsApp : un chemin relatif n'y est pas
 * cliquable. L'adresse se règle par variable d'environnement pour que l'app
 * reste testable ailleurs, avec le domaine de production comme repli.
 *
 * `?de=Prénom` donne au coach l'origine de chaque demande : le prénom part
 * dans le message WhatsApp prérempli, sans aucun suivi technique à maintenir.
 */
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.d5coaching-distance.com";

export function lienInvitation(prenom?: string | null): string {
  const base = `${BASE.replace(/\/$/, "")}/rejoindre`;
  const nom = (prenom ?? "").trim();
  return nom ? `${base}?de=${encodeURIComponent(nom)}` : base;
}

/**
 * Message prêt à coller.
 *
 * Le bouton d'invitation est disponible dès le premier jour, donc le message
 * ne peut pas annoncer « je viens de terminer » : il mettrait un mensonge dans
 * la bouche du participant, devant quelqu'un qui le connaît.
 *
 * `points` vaut null tant que le bilan n'est pas fait. C'est ce qui distingue
 * « je le fais en ce moment » de « je l'ai terminé, voilà ce que j'y ai
 * gagné ».
 */
export function messageInvitation(prenom: string | null | undefined, points: number | null): string {
  const lien = lienInvitation(prenom);

  if (points !== null && points > 0) {
    return [
      "Je viens de terminer le Reboot 40 avec Daye.",
      `En 7 jours j'ai repris ${points} points sur mon score de forme.`,
      "C'est fait pour des gars comme nous, qui ont passé la quarantaine et qui n'ont pas trois heures par jour.",
      `Si tu veux essayer : ${lien}`,
    ].join("\n");
  }

  return [
    "Je fais le challenge Reboot 40 avec Daye en ce moment.",
    "7 jours, 3 séances, et un score de forme mesuré au début et à la fin.",
    "C'est pensé pour les quadras qui veulent s'y remettre sans tout casser.",
    `Si ça te parle : ${lien}`,
  ].join("\n");
}
