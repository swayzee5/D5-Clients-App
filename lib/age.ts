/**
 * L'âge révolu, à partir d'une date de naissance.
 *
 * Calculé sur l'anniversaire et non par division du nombre de jours :
 * 365,25 fait vieillir de un an quelques jours trop tôt, une année sur
 * quatre. Pour un public quarantenaire à qui on adapte l'entraînement selon
 * l'âge, autant que le chiffre soit juste.
 */
export function ageDepuis(date: string | Date): number {
  const n = new Date(date);
  const a = new Date();
  let age = a.getFullYear() - n.getFullYear();
  const avantAnniversaire =
    a.getMonth() < n.getMonth() ||
    (a.getMonth() === n.getMonth() && a.getDate() < n.getDate());
  if (avantAnniversaire) age--;
  return age;
}
