"use server";

import { auth } from "@/auth";
import { saveBilan } from "@/lib/queries/reboot-bilan";
import { SCORE_AXES, type Ratings, type Scores } from "@/lib/reboot-diagnostic";

export type BilanResult =
  | { ok: true; scores: Scores }
  | { ok: false; error: string };

/**
 * Enregistre le bilan de fin de challenge.
 *
 * Les six notes sont revérifiées ici et pas seulement dans le formulaire. Le
 * bouton est désactivé tant qu'il en manque une, mais une action serveur reste
 * appelable directement, et un bilan incomplet fausserait l'écart — qui est la
 * seule chose que ce challenge produise de durable.
 *
 * L'identifiant vient de la session, jamais du client : ce bilan devient une
 * preuve publiable, il ne doit pas pouvoir être écrit au nom d'un autre.
 */
export async function submitBilan(
  ratings: Partial<Ratings>,
  satisfaction: number | null,
  temoignage: string,
  temoignagePubliable: boolean
): Promise<BilanResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Session expirée. Reconnecte-toi." };

  const manquantes = SCORE_AXES.filter(({ key }) => typeof ratings[key] !== "number");
  if (manquantes.length > 0) {
    return { ok: false, error: "Il reste des notes à donner." };
  }

  const texte = temoignage.trim();

  try {
    const scores = await saveBilan(
      session.user.id,
      ratings as Ratings,
      satisfaction,
      texte.length > 0 ? texte : null,
      // Sans texte, l'autorisation n'a pas d'objet : la stocker à true
      // laisserait croire plus tard qu'on dispose d'un accord sur rien.
      texte.length > 0 && temoignagePubliable
    );
    return { ok: true, scores };
  } catch (err) {
    console.error("[submitBilan]", err);
    return { ok: false, error: "Enregistrement impossible. Réessaie dans un instant." };
  }
}
