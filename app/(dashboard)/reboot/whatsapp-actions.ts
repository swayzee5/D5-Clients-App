"use server";

import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { checkAndSendMilestoneNotification } from "@/lib/push";
import { countSeanceCompletions } from "@/lib/queries/reboot";

/**
 * Prévenir le coach quand le troisième message clôt le challenge.
 *
 * Le dernier des dix points peut désormais être ce message, et non plus
 * forcément une séance ou un module. Sans ce contrôle ici, un participant
 * terminerait son challenge sans que personne ne soit prévenu.
 */
async function notifierSiChallengeTermine(clientId: string, waDone: number): Promise<void> {
  try {
    if (waDone < 3) return;
    const seances = await countSeanceCompletions(clientId);
    if (seances < 3) return;
    const { rows } = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM reboot_task_completions WHERE client_id = $1`,
      [clientId]
    );
    if (Number(rows[0]?.cnt ?? 0) < 4) return;

    await pool.query(`CREATE TABLE IF NOT EXISTS coach_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT NOT NULL,
      type TEXT NOT NULL, is_read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(client_id, type)
    )`);
    await pool.query(
      `INSERT INTO coach_notifications (client_id, type) VALUES ($1, 'reboot_completed')
       ON CONFLICT DO NOTHING`,
      [clientId]
    );
  } catch (err) {
    console.error("[notifierSiChallengeTermine]", err);
  }
}

/**
 * Valider un message WhatsApp depuis la page du challenge.
 *
 * Jusqu'ici, un message ne pouvait être déclaré que dans l'enchaînement qui
 * suit la validation d'une séance, et cet écran proposait « passer cette
 * étape ». Qui le passait — pour poster le soir, ou simplement parce qu'il
 * était pressé — ne pouvait plus jamais valider ce point : la séance était
 * terminée, l'enchaînement ne se rejouait pas. Le participant restait bloqué à
 * 9 sur 10 sans comprendre pourquoi, et n'obtenait jamais son certificat.
 *
 * L'enregistrement porte sur « message-N » plutôt que sur l'identifiant d'une
 * séance : ce point du challenge est un message envoyé dans le groupe, pas une
 * séance. N est calculé côté serveur à partir de ce qui est déjà enregistré,
 * donc deux appuis rapprochés ne comptent pas deux fois, et la valeur affichée
 * ne peut pas être devancée par le client.
 */
export async function recordNextWhatsappMessage(clientId: string): Promise<number> {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS reboot_whatsapp_completions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT NOT NULL, session_id TEXT NOT NULL,
      sent_at TIMESTAMPTZ DEFAULT now(), UNIQUE(client_id, session_id)
    )`);

    const { rows } = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM reboot_whatsapp_completions WHERE client_id = $1`,
      [clientId]
    );
    const deja = Number(rows[0]?.cnt ?? 0);
    if (deja >= 3) return deja;

    await pool.query(
      `INSERT INTO reboot_whatsapp_completions (client_id, session_id)
       VALUES ($1, $2) ON CONFLICT (client_id, session_id) DO NOTHING`,
      [clientId, `message-${deja + 1}`]
    );

    await notifierSiChallengeTermine(clientId, deja + 1);
    await checkAndSendMilestoneNotification(clientId);
    revalidatePath("/reboot");
    return deja + 1;
  } catch (err) {
    console.error("[recordNextWhatsappMessage]", err);
    return -1;
  }
}
