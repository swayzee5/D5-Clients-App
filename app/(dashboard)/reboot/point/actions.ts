"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";

/**
 * Enregistre le mini-point de mi-parcours.
 *
 * Idempotent : une seconde validation ne crée pas de doublon. Le participant
 * qui revient sur l'écran après l'avoir rempli ne doit pas pouvoir fausser le
 * suivi du coach par un double envoi.
 *
 * L'identifiant vient de la session, jamais du client : ce point remonte au
 * coach, et une réponse attribuée à quelqu'un d'autre fausserait sa lecture du
 * groupe.
 */
export async function submitMiniPoint(valeurs: {
  seanceFaite: boolean;
  frein: string;
  besoinAide: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Session expirée. Reconnecte-toi." };

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS reboot_mid_checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT NOT NULL UNIQUE, energy INT, sleep_quality INT,
      weight DECIMAL(5,2), feeling TEXT, submitted_at TIMESTAMPTZ DEFAULT now()
    )`);
    await pool.query(`ALTER TABLE reboot_mid_checkins ADD COLUMN IF NOT EXISTS seance_faite BOOLEAN`);
    await pool.query(`ALTER TABLE reboot_mid_checkins ADD COLUMN IF NOT EXISTS besoin_aide TEXT`);

    await pool.query(
      `INSERT INTO reboot_mid_checkins (client_id, seance_faite, feeling, besoin_aide)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (client_id) DO NOTHING`,
      [
        session.user.id,
        valeurs.seanceFaite,
        valeurs.frein.trim() || null,
        valeurs.besoinAide.trim() || null,
      ]
    );
    return { ok: true };
  } catch (err) {
    console.error("[submitMiniPoint]", err);
    return { ok: false, error: "Enregistrement impossible. Réessaie dans un instant." };
  }
}
