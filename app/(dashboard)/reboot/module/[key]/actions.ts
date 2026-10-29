"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { checkAndSendMilestoneNotification } from "@/lib/push";
import { marquerActivite } from "@/lib/derniere-activite";
import { termineEtPrevenirCoach } from "@/lib/queries/reboot-complet";

/**
 * Valider un module.
 *
 * Renvoie `termine` quand ce module était la dixième étape : l'écran emmène
 * alors directement au bilan de fin, au lieu de laisser le participant
 * revenir au tableau de bord chercher ce qu'il lui reste à faire.
 */
export async function validateModule(taskKey: string): Promise<{ termine: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { termine: false };
  // Un geste fait dans l'app, pas seulement une connexion : c'est ce
  // qui dit au coach que le client est toujours là.
  marquerActivite(session.user.id);

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS reboot_task_completions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT NOT NULL,
      task_key TEXT NOT NULL, completed_at TIMESTAMPTZ DEFAULT now(), UNIQUE(client_id, task_key)
    )`);
    await pool.query(`INSERT INTO reboot_task_completions (client_id, task_key) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [session.user.id, taskKey]);
    const termine = await termineEtPrevenirCoach(session.user.id);
    await checkAndSendMilestoneNotification(session.user.id);
    revalidatePath("/reboot");
    revalidatePath(`/reboot/module/${taskKey}`);
    return { termine };
  } catch (err) { console.error("[validateModule]", err); return { termine: false }; }
}
