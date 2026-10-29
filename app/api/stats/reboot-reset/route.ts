import { NextRequest } from "next/server";
import { jsonUtf8 } from "@/lib/json-utf8";
import { pool } from "@/lib/db";

/**
 * Défaire une étape d'un compte de test.
 *
 * Rien dans l'application ne se décoche : c'est volontaire, un participant ne
 * doit pas pouvoir annuler ce qu'il a fait. Mais le coach, lui, doit pouvoir
 * rejouer la fin du parcours autant de fois qu'il le faut avant de la mettre
 * devant treize personnes — et sans ça, chaque essai demandait un compte neuf
 * et vingt minutes de clics.
 *
 * Deux garde-fous, parce que la route efface des données :
 *
 *   1. Elle ne touche que les comptes marqués participant Reboot. Un client
 *      accompagné ne peut pas être atteint, même avec le bon secret et une
 *      faute de frappe dans l'adresse.
 *   2. Sans `fix=1`, elle ne fait que décrire l'état et ce qu'elle
 *      supprimerait. On voit avant d'agir.
 *
 * Exemples :
 *   …/api/stats/reboot-reset?secret=…&email=moi@exemple.com
 *   …/api/stats/reboot-reset?secret=…&email=…&quoi=message&fix=1
 */

export const dynamic = "force-dynamic";

type Quoi = "message" | "module" | "seance" | "bilan";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const secret = p.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return jsonUtf8({ error: "Non autorisé" }, { status: 401 });
  }

  const email = (p.get("email") ?? "").trim().toLowerCase();
  if (!email) return jsonUtf8({ error: "Paramètre email manquant" }, { status: 400 });

  const { rows: comptes } = await pool.query<{
    id: string;
    first_name: string;
    is_reboot_only: boolean;
  }>(
    `SELECT id::text AS id, first_name, is_reboot_only
       FROM clients WHERE lower(email) = $1`,
    [email]
  );
  const compte = comptes[0];
  if (!compte) return jsonUtf8({ error: "Aucun compte avec cette adresse" }, { status: 404 });
  if (!compte.is_reboot_only) {
    return jsonUtf8(
      {
        error:
          "Ce compte n'est pas un participant Reboot. La route ne touche pas aux clients accompagnés.",
      },
      { status: 400 }
    );
  }

  const etat = async () => {
    const [seances, messages, modules, bilan] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS n FROM reboot_completions WHERE client_id = $1::uuid`, [compte.id]).catch(() => ({ rows: [{ n: "?" }] })),
      pool.query(`SELECT COUNT(*) AS n FROM reboot_whatsapp_completions WHERE client_id = $1`, [compte.id]).catch(() => ({ rows: [{ n: "?" }] })),
      pool.query(`SELECT COUNT(*) AS n FROM reboot_task_completions WHERE client_id = $1`, [compte.id]).catch(() => ({ rows: [{ n: "?" }] })),
      pool.query(`SELECT COUNT(*) AS n FROM reboot_bilans WHERE client_id = $1::uuid`, [compte.id]).catch(() => ({ rows: [{ n: "?" }] })),
    ]);
    return {
      séances: `${seances.rows[0].n}/3`,
      messages: `${messages.rows[0].n}/3`,
      modules: `${modules.rows[0].n}/4`,
      bilan: Number(bilan.rows[0].n) > 0 ? "rempli" : "absent",
    };
  };

  const quoi = p.get("quoi") as Quoi | null;
  const appliquer = p.get("fix") === "1";

  if (!quoi || !appliquer) {
    return jsonUtf8({
      compte: `${compte.first_name} (${email})`,
      état: await etat(),
      àFaire:
        "Ajoute &quoi=message|module|seance|bilan et &fix=1 pour défaire la dernière entrée de ce type.",
    });
  }

  // La plus récente, parce que c'est celle qu'on vient de poser en testant.
  const ORDRES: Record<Quoi, { sql: string; libelle: string }> = {
    message: {
      sql: `DELETE FROM reboot_whatsapp_completions WHERE id = (
              SELECT id FROM reboot_whatsapp_completions
               WHERE client_id = $1 ORDER BY sent_at DESC LIMIT 1)`,
      libelle: "dernier message WhatsApp",
    },
    module: {
      sql: `DELETE FROM reboot_task_completions WHERE id = (
              SELECT id FROM reboot_task_completions
               WHERE client_id = $1 ORDER BY completed_at DESC LIMIT 1)`,
      libelle: "dernier module",
    },
    seance: {
      sql: `DELETE FROM reboot_completions WHERE id = (
              SELECT id FROM reboot_completions
               WHERE client_id = $1::uuid ORDER BY completed_at DESC LIMIT 1)`,
      libelle: "dernière séance",
    },
    // Le bilan emporte la réponse sur l'accompagnement : elle vit dans la
    // même ligne, et la garder sans son bilan n'aurait aucun sens.
    bilan: {
      sql: `DELETE FROM reboot_bilans WHERE client_id = $1::uuid`,
      libelle: "bilan de fin et réponse sur l'accompagnement",
    },
  };

  const ordre = ORDRES[quoi];
  if (!ordre) return jsonUtf8({ error: "Valeur de quoi inattendue" }, { status: 400 });

  try {
    const { rowCount } = await pool.query(ordre.sql, [compte.id]);
    return jsonUtf8({
      compte: `${compte.first_name} (${email})`,
      supprimé: rowCount ? ordre.libelle : `rien à supprimer (${ordre.libelle})`,
      état: await etat(),
      note: "Ferme et rouvre l'application pour revoir l'écran à jour.",
    });
  } catch (err) {
    return jsonUtf8({ error: String(err).slice(0, 300) }, { status: 500 });
  }
}
