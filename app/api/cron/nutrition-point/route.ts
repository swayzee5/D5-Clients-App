import { NextRequest } from "next/server";
import { jsonUtf8 } from "@/lib/json-utf8";
import { pool } from "@/lib/db";
import { sendPushToClient } from "@/lib/push";
import { JOURS_ENTRE_POINTS } from "@/lib/nutrition-suivi";
import { clientsAvecPointDu } from "@/lib/queries/nutrition-suivi";

/**
 * Le rappel du point nutritionnel, une fois par jour.
 *
 * Le client n'a pas à penser au calendrier. Lui demander de revenir « dans six
 * semaines » revient à ne pas le lui demander : personne ne note ça, et le
 * point se perd — avec lui l'ajustement qui justifie l'accompagnement.
 *
 * Deux garanties :
 *
 *   1. Une seule relance par échéance. La clé contient la date du dernier
 *      envoi, donc un client qui répond puis repasse six semaines plus tard
 *      est relancé à nouveau, alors qu'une clé fixe le lui interdirait pour
 *      toujours.
 *   2. L'enregistrement fait office de verrou : si la ligne existe déjà,
 *      l'envoi a eu lieu et on ne recommence pas, même si la tâche est
 *      relancée à la main.
 */

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const parUrl = req.nextUrl.searchParams.get("secret");
  const autorise =
    !secret || req.headers.get("authorization") === `Bearer ${secret}` || parUrl === secret;
  if (!autorise) return jsonUtf8({ error: "Unauthorized" }, { status: 401 });

  const essaiSeul = req.nextUrl.searchParams.get("essai") === "1";

  try {
    const dus = await clientsAvecPointDu(JOURS_ENTRE_POINTS);
    const envoyees: string[] = [];
    const ignorees: string[] = [];

    for (const client of dus) {
      // La clé change à chaque échéance : elle contient le nombre de semaines
      // écoulées, arrondi à la période. Sans ça, un client relancé une fois ne
      // le serait plus jamais.
      const periode = Math.floor(client.jours / JOURS_ENTRE_POINTS);
      const cle = `nutrition_point_${periode}`;

      if (essaiSeul) {
        envoyees.push(`${client.prenom} : ${cle} (essai, rien envoyé)`);
        continue;
      }

      const { rows } = await pool.query(
        `INSERT INTO push_notification_log (client_id, notification_type)
         VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id`,
        [client.id, cle]
      );
      if (rows.length === 0) {
        ignorees.push(`${client.prenom} : déjà relancé pour cette échéance`);
        continue;
      }

      await sendPushToClient(
        client.id,
        "Ton point nutrition",
        "Six semaines ont passé. Cinq questions pour ajuster ce qui coince.",
        "/nutrition/profil"
      );
      envoyees.push(`${client.prenom} : relancé (${client.jours} jours)`);
    }

    return jsonUtf8({
      date: new Date().toISOString().slice(0, 10),
      clientsConcernés: dus.length,
      envoyées: envoyees,
      ignorées: ignorees,
    });
  } catch (err) {
    console.error("[cron/nutrition-point]", err);
    return jsonUtf8({ error: String(err) }, { status: 500 });
  }
}
