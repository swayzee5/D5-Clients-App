"use server";

import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { checkAndSendMilestoneNotification } from "@/lib/push";
import { marquerActivite } from "@/lib/derniere-activite";
import { termineEtPrevenirCoach } from "@/lib/queries/reboot-complet";

/**
 * Valider une séance.
 *
 * Renvoie `termine` quand cette séance était la dixième étape : l'écran
 * emmène alors au bilan de fin plutôt qu'au tableau de bord.
 */
export async function completeSession(clientId: string, sessionId: string): Promise<{ termine: boolean }> {
  // Un geste fait dans l'app, pas seulement une connexion : c'est
  // ce qui dit au coach que le client est toujours là.
  marquerActivite(clientId);

  await pool.query(`INSERT INTO reboot_completions (client_id, session_id) VALUES ($1, $2) ON CONFLICT (client_id, session_id) DO NOTHING`, [clientId, sessionId]);
  const termine = await termineEtPrevenirCoach(clientId);
  await checkAndSendMilestoneNotification(clientId);
  revalidatePath("/reboot");
  revalidatePath(`/reboot/${sessionId}`);
  return { termine };
}

export async function submitSessionCheckin(clientId: string, sessionId: string, energy: number, difficulty: string, feeling: string) {
  // Un geste fait dans l'app, pas seulement une connexion : c'est
  // ce qui dit au coach que le client est toujours là.
  marquerActivite(clientId);

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS reboot_session_checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT NOT NULL,
      session_id TEXT NOT NULL, energy INT, difficulty TEXT, feeling TEXT,
      submitted_at TIMESTAMPTZ DEFAULT now(), UNIQUE(client_id, session_id)
    )`);
    await pool.query(`INSERT INTO reboot_session_checkins (client_id, session_id, energy, difficulty, feeling) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (client_id, session_id) DO NOTHING`,
      [clientId, sessionId, energy, difficulty, feeling || null]);
  } catch (err) { console.error("[submitSessionCheckin]", err); }
}

/** Même principe : le message posté peut être la dixième étape. */
export async function recordWhatsappSend(clientId: string, sessionId: string): Promise<{ termine: boolean }> {
  // Un geste fait dans l'app, pas seulement une connexion : c'est
  // ce qui dit au coach que le client est toujours là.
  marquerActivite(clientId);

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS reboot_whatsapp_completions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT NOT NULL, session_id TEXT NOT NULL,
      sent_at TIMESTAMPTZ DEFAULT now(), UNIQUE(client_id, session_id)
    )`);
    await pool.query(`INSERT INTO reboot_whatsapp_completions (client_id, session_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [clientId, sessionId]);
  } catch (err) { console.error("[recordWhatsappSend]", err); }
  const termine = await termineEtPrevenirCoach(clientId);
  await checkAndSendMilestoneNotification(clientId);
  revalidatePath("/reboot");
  return { termine };
}
