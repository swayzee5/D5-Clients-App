/**
 * Les exercices qui se comptent en secondes, pas en répétitions.
 *
 * Gainage, planche, chaise : « 3 × 12 » n'y veut rien dire. La colonne qui
 * porte les répétitions est du texte libre, donc une durée s'y range sans
 * rien changer en base — à condition que tout le monde l'écrive pareil, et
 * sache la relire.
 *
 * Le format retenu est « 45 s », « 1 min », « 1 min 30 ». Il se lit tel quel
 * chez le client, qui n'a aucune conversion à faire au milieu de sa série.
 */

/** Une valeur de répétitions est-elle une durée ? */
export function estDuree(valeur: string | null | undefined): boolean {
  if (!valeur) return false;
  return /^\s*\d+\s*(s|sec|secondes?|min|minutes?)\b/i.test(valeur.trim());
}

/** Les secondes contenues dans une durée écrite, ou null. */
export function secondesDe(valeur: string | null | undefined): number | null {
  if (!valeur) return null;
  const t = valeur.trim();

  const minSec = t.match(/^(\d+)\s*min(?:ute)?s?\s*(\d+)?\s*s?/i);
  if (minSec) {
    return parseInt(minSec[1], 10) * 60 + (minSec[2] ? parseInt(minSec[2], 10) : 0);
  }

  const sec = t.match(/^(\d+)\s*(?:s|sec|secondes?)\b/i);
  if (sec) return parseInt(sec[1], 10);

  return null;
}

/**
 * Écrit une durée en secondes.
 *
 * Au-delà d'une minute, on bascule en minutes : « 90 s » se compte mal quand
 * on est en appui sur les coudes, « 1 min 30 » se repère sur une horloge.
 */
export function formatDuree(secondes: number): string {
  const s = Math.max(0, Math.round(secondes));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  const reste = s % 60;
  return reste === 0 ? `${min} min` : `${min} min ${reste}`;
}
