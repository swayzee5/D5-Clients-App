import { pool } from "@/lib/db";

/**
 * La fin de parcours : la vidéo de clôture et la prise de rendez-vous.
 *
 * Tout est réglable depuis le CRM, rien n'est écrit en dur. Le lien de
 * réservation va changer le jour où le coach change d'outil d'agenda, et le
 * prix changera plus souvent que ça — les coder ici imposerait un déploiement
 * pour une modification qui n'en est pas une.
 */

/**
 * Ajoute les colonnes de suivi si elles manquent.
 *
 * Le fichier de migration existe, mais rien ne l'exécute : les deux
 * applications se partagent une base sans outil de migration commun. Une
 * colonne absente faisait échouer la page du coach, qui affichait alors
 * « personne n'a terminé » — une panne déguisée en vérité.
 *
 * Mémoïsé : l'ordre est idempotent mais inutile à rejouer à chaque clic.
 */
let colonnesPretes = false;
async function ensureColonnesFin(): Promise<void> {
  if (colonnesPretes) return;
  await pool
    .query(
      `ALTER TABLE reboot_bilans
         ADD COLUMN IF NOT EXISTS video_fin_vue_at TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS cta_clique_at    TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS rdv_confirme_at  TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS relance_at       TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS intention        TEXT,
         ADD COLUMN IF NOT EXISTS intention_texte  TEXT,
         ADD COLUMN IF NOT EXISTS intention_at     TIMESTAMPTZ`
    )
    .catch(() => {});
  colonnesPretes = true;
}

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

/**
 * Ce que le participant répond à la question de l'accompagnement.
 *
 * « J'hésite » n'est pas une politesse : c'est là que se trouve la plupart
 * des gens, et une question à deux branches les pousse vers le non, parce que
 * dire oui veut dire, dans leur tête, un engagement financier. Le troisième
 * choix mène au même rendez-vous sans rien engager, et c'est précisément ce
 * que la vidéo promet.
 */
export type Intention = "oui" | "hesite" | "non";

/** Ce que le coach doit savoir pour relancer. */
export type SuiviFin = {
  videoVue: boolean;
  ctaClique: boolean;
  rdvConfirme: boolean;
};

export async function getSuiviFin(clientId: string): Promise<SuiviFin | null> {
  try {
    await ensureColonnesFin();
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
  await ensureColonnesFin();
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

/**
 * Enregistre la réponse à la question de l'accompagnement.
 *
 * Modifiable, contrairement aux marquages de passage : quelqu'un qui répond
 * « non » le dimanche soir et revient le mardi pour dire qu'il hésite doit
 * pouvoir le faire. C'est sa réponse actuelle qui intéresse le coach, pas la
 * première.
 *
 * `intention_at` suit la dernière réponse pour la même raison : savoir qu'il
 * a changé d'avis, et quand, vaut mieux qu'une date figée.
 */
export async function enregistrerIntention(
  clientId: string,
  intention: Intention,
  texte: string
): Promise<{ ok: boolean }> {
  try {
    await ensureColonnesFin();
    const { rowCount } = await pool.query(
      `UPDATE reboot_bilans
          SET intention = $2, intention_texte = $3, intention_at = now()
        WHERE client_id = $1::uuid`,
      [clientId, intention, texte.trim().slice(0, 2000) || null]
    );
    // Aucune ligne touchée veut dire aucun bilan : la question ne s'affiche
    // qu'après le bilan, donc c'est anormal et il ne faut pas le confirmer.
    return { ok: (rowCount ?? 0) > 0 };
  } catch (err) {
    console.error("[reboot-fin] intention non enregistrée", err);
    return { ok: false };
  }
}

/** La réponse déjà donnée, pour rouvrir l'écran sur ce qu'il a répondu. */
export async function getIntention(
  clientId: string
): Promise<{ intention: Intention; texte: string | null } | null> {
  try {
    await ensureColonnesFin();
    const { rows } = await pool.query<{ intention: string | null; intention_texte: string | null }>(
      `SELECT intention, intention_texte FROM reboot_bilans WHERE client_id = $1::uuid`,
      [clientId]
    );
    const i = rows[0]?.intention;
    if (i !== "oui" && i !== "hesite" && i !== "non") return null;
    return { intention: i, texte: rows[0]?.intention_texte ?? null };
  } catch {
    return null;
  }
}
