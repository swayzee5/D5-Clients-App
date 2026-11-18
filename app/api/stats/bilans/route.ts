import { NextRequest } from "next/server";
import { jsonUtf8 } from "@/lib/json-utf8";
import { pool } from "@/lib/db";

/**
 * Ce que contient réellement chaque bilan.
 *
 * La fiche du CRM peut ne rien afficher pour deux raisons opposées : le
 * participant n'a rien écrit, ou le CRM n'arrive pas à lire la colonne. Tant
 * qu'on ne regarde pas la ligne elle-même, on ne peut pas les départager — et
 * on corrige au hasard.
 *
 * Lecture seule, côté application cliente parce que c'est elle qui écrit ces
 * lignes, et que son secret est celui qui fonctionne.
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return jsonUtf8({ error: "Non autorisé" }, { status: 401 });
  }

  // La colonne est créée par l'écriture du bilan ; sur une base où aucun
  // bilan n'a encore été enregistré depuis la mise à jour, elle peut manquer
  // — et son absence ferait échouer toute la requête.
  await pool
    .query(`ALTER TABLE reboot_bilans ADD COLUMN IF NOT EXISTS amelioration TEXT`)
    .catch(() => {});

  try {
    const { rows } = await pool.query(
      `SELECT c.first_name AS prenom, c.last_name AS nom,
              b.score_global, b.satisfaction, b.temoignage,
              b.temoignage_publiable, b.amelioration, b.submitted_at
         FROM reboot_bilans b
         JOIN clients c ON c.id::text = b.client_id::text
        ORDER BY b.submitted_at DESC
        LIMIT 50`
    );

    return jsonUtf8({
      total: rows.length,
      bilans: rows.map((r) => ({
        participant: `${r.prenom} ${r.nom}`,
        score: r.score_global,
        satisfaction: r.satisfaction,
        temoignage: r.temoignage,
        publiable: r.temoignage_publiable,
        amelioration: r.amelioration,
        le: r.submitted_at,
        // Dit en clair ce que le CRM devrait afficher, pour qu'un écran vide
        // ne soit plus ambigu.
        diagnostic:
          r.satisfaction === null && r.amelioration === null
            ? "Rempli avec l'ancien formulaire : l'avis n'a pas été enregistré."
            : r.amelioration === null
            ? "Satisfaction donnée, pas d'amélioration."
            : "Complet.",
      })),
    });
  } catch (err) {
    return jsonUtf8({ error: String(err).slice(0, 300) }, { status: 500 });
  }
}
