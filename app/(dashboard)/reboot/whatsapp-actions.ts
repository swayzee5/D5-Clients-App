"use server";

import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { checkAndSendMilestoneNotification } from "@/lib/push";
import { marquerActivite } from "@/lib/derniere-activite";
import { termineEtPrevenirCoach } from "@/lib/queries/reboot-complet";

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
export async function recordNextWhatsappMessage(
  clientId: string
): Promise<{ compte: number; termine: boolean }> {
  // Un geste fait dans l'app, pas seulement une connexion : c'est
  // ce qui dit au coach que le client est toujours là.
  marquerActivite(clientId);

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
    if (deja >= 3) return { compte: deja, termine: await termineEtPrevenirCoach(clientId) };

    await pool.query(
      `INSERT INTO reboot_whatsapp_completions (client_id, session_id)
       VALUES ($1, $2) ON CONFLICT (client_id, session_id) DO NOTHING`,
      [clientId, `message-${deja + 1}`]
    );

    const termine = await termineEtPrevenirCoach(clientId);
    await checkAndSendMilestoneNotification(clientId);
    revalidatePath("/reboot");
    return { compte: deja + 1, termine };
  } catch (err) {
    console.error("[recordNextWhatsappMessage]", err);
    return { compte: -1, termine: false };
  }
}
