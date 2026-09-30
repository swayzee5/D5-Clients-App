import { pool } from "@/lib/db";

/**
 * La vidéo d'explication du challenge, à voir avant d'accéder au contenu.
 *
 * Pourquoi elle est obligatoire : sans elle, chacun découvre le déroulé par
 * tâtonnement. Les premiers retours l'ont montré — un participant qui ne sait
 * pas qu'il doit cocher ses exercices, poster dans le groupe et lire les
 * modules ne réclame pas d'explication, il fait ce qu'il comprend et s'arrête
 * à 6 sur 10.
 *
 * Elle vient après le diagnostic : la personne a déjà mis des mots sur sa
 * situation et vu son score, donc elle sait pourquoi elle regarde.
 */

/** Identifiant Vimeo de la vidéo, réglé par le coach dans le CRM. */
export async function getIntroVideoId(): Promise<string | null> {
  try {
    const { rows } = await pool.query<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'reboot_intro_video_id'`
    );
    const valeur = rows[0]?.value?.trim();
    return valeur ? valeur : null;
  } catch {
    // Tant qu'aucune vidéo n'est réglée, la porte n'existe pas : mieux vaut un
    // challenge sans explication qu'un challenge inaccessible.
    return null;
  }
}

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reboot_intro_views (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      /** « video » : regardée jusqu'au bout. « secours » : lecture impossible. */
      methode    TEXT NOT NULL DEFAULT 'video',
      watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id)
    )
  `);
}

/**
 * Ce participant doit-il encore regarder la vidéo ?
 *
 * Trois conditions : être participant Reboot, qu'une vidéo soit réglée, et ne
 * pas l'avoir déjà vue.
 *
 * En cas d'erreur, renvoie false — c'est-à-dire laisse passer, comme pour le
 * diagnostic. Une base indisponible ne doit pas enfermer treize personnes
 * dehors.
 */
export async function needsIntroVideo(clientId: string): Promise<string | null> {
  try {
    const videoId = await getIntroVideoId();
    if (!videoId) return null;

    const { rows } = await pool.query<{ is_reboot_only: boolean }>(
      `SELECT is_reboot_only FROM clients WHERE id = $1`,
      [clientId]
    );
    if (!rows.length || !rows[0].is_reboot_only) return null;

    await ensureTable();
    const { rowCount } = await pool.query(
      `SELECT 1 FROM reboot_intro_views WHERE client_id = $1`,
      [clientId]
    );
    return rowCount === 0 ? videoId : null;
  } catch (err) {
    console.error("[reboot-intro] vérification impossible, accès laissé libre", err);
    return null;
  }
}

/** Enregistre le visionnage. Idempotent. */
export async function markIntroWatched(clientId: string, methode: "video" | "secours"): Promise<void> {
  await ensureTable();
  await pool.query(
    `INSERT INTO reboot_intro_views (client_id, methode) VALUES ($1, $2)
     ON CONFLICT (client_id) DO NOTHING`,
    [clientId, methode]
  );
}
