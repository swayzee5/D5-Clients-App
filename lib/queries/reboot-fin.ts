import { pool } from "@/lib/db";

/**
 * La fin de parcours : la vidéo de clôture et la prise de rendez-vous.
 *
 * Tout est réglable depuis le CRM, rien n'est écrit en dur. Le lien de
 * réservation va changer le jour où le coach change d'outil d'agenda, et le
 * prix changera plus souvent que ça — les coder ici imposerait un déploiement
 * pour une modification qui n'en est pas une.
 */

export type ReglagesFin = {
  /** Identifiant Vimeo de la vidéo de clôture. Null = pas de vidéo. */
  videoId: string | null;
  /** Adresse de prise de rendez-vous. Null = le bouton ne s'affiche pas. */
  lienReservation: string | null;
  /** Texte libre, par exemple « 1 500 € · 6 mois, possibilité en 3 fois ». */
  prix: string | null;
};

const CLES = ["reboot_video_fin", "lien_reservation", "prix_accompagnement"] as const;

export async function getReglagesFin(): Promise<ReglagesFin> {
  try {
    const { rows } = await pool.query<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings WHERE key = ANY($1)`,
      [CLES as unknown as string[]]
    );
    const lire = (k: string) => rows.find((r) => r.key === k)?.value?.trim() || null;
    return {
      videoId: lire("reboot_video_fin"),
      lienReservation: lire("lien_reservation"),
      prix: lire("prix_accompagnement"),
    };
  } catch {
    // Réglages absents : l'écran de fin se réduit à la comparaison des
    // scores, qui vaut déjà le détour. Mieux vaut ça qu'une page en erreur
    // juste après que quelqu'un a terminé son challenge.
    return { videoId: null, lienReservation: null, prix: null };
  }
}

/** Ce que le coach doit savoir pour relancer. */
export type SuiviFin = {
  videoVue: boolean;
  ctaClique: boolean;
  rdvConfirme: boolean;
};

export async function getSuiviFin(clientId: string): Promise<SuiviFin | null> {
  try {
    const { rows } = await pool.query<{
      video_fin_vue_at: Date | null;
      cta_clique_at: Date | null;
      rdv_confirme_at: Date | null;
    }>(
      `SELECT video_fin_vue_at, cta_clique_at, rdv_confirme_at
         FROM reboot_bilans WHERE client_id = $1::uuid`,
      [clientId]
    );
    const l = rows[0];
    if (!l) return null;
    return {
      videoVue: l.video_fin_vue_at !== null,
      ctaClique: l.cta_clique_at !== null,
      rdvConfirme: l.rdv_confirme_at !== null,
    };
  } catch {
    return null;
  }
}

/**
 * Enregistre un passage de la fin de parcours.
 *
 * `COALESCE` garde la première fois : savoir qu'il a cliqué le jour du bilan
 * plutôt qu'une semaine après change la relance du coach, et un écrasement à
 * chaque visite effacerait cette information.
 */
export async function marquerFin(
  clientId: string,
  quoi: "video" | "cta"
): Promise<void> {
  const colonne = quoi === "video" ? "video_fin_vue_at" : "cta_clique_at";
  await pool
    .query(
      `UPDATE reboot_bilans
          SET ${colonne} = COALESCE(${colonne}, now())
        WHERE client_id = $1::uuid`,
      [clientId]
    )
    .catch((err) => {
      // Un suivi perdu ne doit jamais empêcher quelqu'un de prendre rendez-vous.
      console.error("[reboot-fin] marquage impossible", err);
    });
}
