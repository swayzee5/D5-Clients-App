import { NextRequest } from "next/server";
import { jsonUtf8 } from "@/lib/json-utf8";
import { pool } from "@/lib/db";
import { sendPushToClient } from "@/lib/push";
import { countSeanceCompletions } from "@/lib/queries/reboot";
import { cleEnvoi, relanceDuJour, type Relance } from "@/lib/reboot-relances";

/**
 * Les relances du challenge, une fois par jour.
 *
 * Le calendrier est calé sur la date de départ de la cohorte, pas sur la
 * création du compte : les comptes sont créés le week-end pour un challenge qui
 * démarre le lundi, et compter depuis la création enverrait « fais ta première
 * séance » un samedi soir.
 *
 * Trois garanties, dans cet ordre d'importance :
 *
 *   1. L'action est revérifiée juste avant l'envoi. Relancer quelqu'un sur un
 *      bilan qu'il vient de remplir est pire que ne rien envoyer : il en
 *      conclut que son travail n'a pas été reçu.
 *   2. Une même échéance n'est jamais envoyée deux fois, même si la tâche est
 *      relancée à la main. La clé contient la date de départ, pour qu'un
 *      participant qui referait le challenge plus tard reçoive à nouveau ses
 *      relances.
 *   3. Rien n'est envoyé à qui n'est plus participant Reboot ou dont le compte
 *      est archivé.
 */

export const maxDuration = 60;

type Participant = {
  id: string;
  first_name: string;
  reboot_start_date: Date;
};

/** L'action attendue manque-t-elle encore ? */
async function actionManquante(relance: Relance, clientId: string): Promise<boolean> {
  if (relance.condition === "aucune_action") {
    // « Avoir commencé » veut dire avoir validé une séance ou un module. Ouvrir
    // l'app ne compte pas : beaucoup l'ouvrent, regardent, et referment.
    const seances = await countSeanceCompletions(clientId).catch(() => 0);
    if (seances > 0) return false;
    const { rowCount } = await pool
      .query(`SELECT 1 FROM reboot_task_completions WHERE client_id = $1 LIMIT 1`, [clientId])
      .catch(() => ({ rowCount: 0 }));
    return (rowCount ?? 0) === 0;
  }

  const table = relance.condition === "mini_point" ? "reboot_mid_checkins" : "reboot_bilans";
  const colonne = relance.condition === "mini_point" ? "client_id" : "client_id::text";
  const { rowCount } = await pool
    .query(`SELECT 1 FROM ${table} WHERE ${colonne} = $1 LIMIT 1`, [clientId])
    .catch(() => ({ rowCount: 0 }));
  return (rowCount ?? 0) === 0;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const parUrl = req.nextUrl.searchParams.get("secret");
  const autorise =
    !secret ||
    req.headers.get("authorization") === `Bearer ${secret}` ||
    parUrl === secret;
  if (!autorise) return jsonUtf8({ error: "Unauthorized" }, { status: 401 });

  // Permet d'essayer la tâche en se plaçant à une autre date, sans attendre
  // le bon jour. Sans ça, vérifier une relance du dimanche demande d'attendre
  // dimanche.
  const simule = req.nextUrl.searchParams.get("date");
  const aujourdhui = simule ? new Date(`${simule}T12:00:00Z`) : new Date();
  const essaiSeul = req.nextUrl.searchParams.get("essai") === "1";

  try {
    const { rows: participants } = await pool.query<Participant>(
      `SELECT id::text AS id, first_name, reboot_start_date
       FROM clients
       WHERE is_reboot_only = true
         AND is_active = true
         AND is_blocked = false
         AND reboot_start_date IS NOT NULL`
    );

    const envoyees: string[] = [];
    const ignorees: string[] = [];

    for (const p of participants) {
      const relance = relanceDuJour(new Date(p.reboot_start_date), aujourdhui);
      if (!relance) continue;

      if (!(await actionManquante(relance, p.id))) {
        ignorees.push(`${p.first_name} : ${relance.cle} déjà fait`);
        continue;
      }

      const cle = cleEnvoi(relance, new Date(p.reboot_start_date));

      if (essaiSeul) {
        envoyees.push(`${p.first_name} : ${relance.cle} (essai, rien envoyé)`);
        continue;
      }

      // L'enregistrement fait office de verrou : si la ligne existe déjà,
      // l'envoi a eu lieu et on ne recommence pas.
      const { rows } = await pool.query(
        `INSERT INTO push_notification_log (client_id, notification_type)
         VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id`,
        [p.id, cle]
      );
      if (rows.length === 0) {
        ignorees.push(`${p.first_name} : ${relance.cle} déjà envoyé`);
        continue;
      }

      await sendPushToClient(p.id, relance.titre, relance.message, relance.chemin);
      envoyees.push(`${p.first_name} : ${relance.cle}`);
    }

    return jsonUtf8({
      date: aujourdhui.toISOString().slice(0, 10),
      participants: participants.length,
      envoyées: envoyees,
      ignorées: ignorees,
    });
  } catch (err) {
    console.error("[cron/reboot-relances]", err);
    return jsonUtf8({ error: String(err) }, { status: 500 });
  }
}
