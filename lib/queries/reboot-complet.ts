import { pool } from "@/lib/db";
import { countSeanceCompletions } from "@/lib/queries/reboot";

/**
 * Le challenge est-il terminé ? Et, si oui, prévenir le coach.
 *
 * Les dix étapes : trois séances, trois messages WhatsApp, quatre modules.
 * La dixième peut être n'importe laquelle des trois — l'ordre appartient au
 * participant — donc chaque validation doit se poser la question.
 *
 * Le même calcul était recopié dans trois fichiers, à trois endroits où une
 * correction devait être faite trois fois. Il n'y en a plus qu'un.
 *
 * La valeur de retour sert à l'écran : la validation de la dixième étape
 * emmène directement au bilan de fin. Sans ça, le participant revenait au
 * tableau de bord et devait deviner qu'il lui restait quelque chose à faire —
 * juste après le seul geste de la semaine qui méritait une récompense.
 */
export async function termineEtPrevenirCoach(clientId: string): Promise<boolean> {
  try {
    const [seances, modules, whatsapp] = await Promise.all([
      countSeanceCompletions(clientId),
      pool
        .query<{ cnt: string }>(
          `SELECT COUNT(*) AS cnt FROM reboot_task_completions WHERE client_id = $1`,
          [clientId]
        )
        .catch(() => ({ rows: [{ cnt: "0" }] })),
      pool
        .query<{ cnt: string }>(
          `SELECT COUNT(*) AS cnt FROM reboot_whatsapp_completions WHERE client_id = $1`,
          [clientId]
        )
        .catch(() => ({ rows: [{ cnt: "0" }] })),
    ]);

    const termine =
      seances >= 3 &&
      Number(modules.rows[0]?.cnt ?? 0) >= 4 &&
      Number(whatsapp.rows[0]?.cnt ?? 0) >= 3;

    if (!termine) return false;

    await pool.query(`CREATE TABLE IF NOT EXISTS coach_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT NOT NULL,
      type TEXT NOT NULL, is_read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(client_id, type)
    )`);
    await pool.query(
      `INSERT INTO coach_notifications (client_id, type)
       VALUES ($1, 'reboot_completed') ON CONFLICT DO NOTHING`,
      [clientId]
    );
    return true;
  } catch (err) {
    // Un avertissement manqué ne doit pas faire échouer la validation : le
    // point est acquis, c'est le seul résultat que le participant attend.
    console.error("[reboot-complet]", err);
    return false;
  }
}
