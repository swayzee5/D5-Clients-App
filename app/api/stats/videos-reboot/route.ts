import { NextRequest } from "next/server";
import { jsonUtf8 } from "@/lib/json-utf8";
import { pool } from "@/lib/db";

/**
 * Pourquoi la vidéo affichée dans une séance Reboot n'est pas celle de la
 * bibliothèque.
 *
 * Chaque exercice d'une séance garde sa propre copie de l'identifiant Vimeo,
 * posée au moment où la séance a été construite. L'affichage privilégie cette
 * copie, et ne se rabat sur la bibliothèque que si elle est vide.
 *
 * Conséquence : filmer une nouvelle vidéo et la rattacher à l'exercice de la
 * bibliothèque ne change rien aux séances déjà construites. Elles continuent
 * de montrer l'ancienne.
 *
 * Trois cas donnent le même symptôme — « ma nouvelle vidéo ne s'affiche pas »
 * — et appellent trois gestes différents. Cette route les distingue.
 */

export const maxDuration = 60;

type Ligne = {
  seance: string;
  exercice: string;
  copie: string | null;
  lie: boolean;
  biblio_nom: string | null;
  biblio_video: string | null;
  supprimee: boolean;
};

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return jsonUtf8({ error: "Unauthorized" }, { status: 401 });
  }

  // `probleme=1` ne renvoie que ce qui cloche : avec deux cents exercices, la
  // liste complète noie ce qu'on cherche.
  const seulementProblemes = req.nextUrl.searchParams.get("probleme") === "1";
  const rafraichir = req.nextUrl.searchParams.get("rafraichir") === "1";

  try {
    // Aligner les séances sur la bibliothèque : on efface la copie figée dans
    // la séance, et l'affichage se rabat alors sur l'exercice de bibliothèque
    // — donc sur la vidéo la plus récente. Effacer plutôt que recopier évite
    // de refiger une valeur qui redeviendra périmée au prochain tournage.
    //
    // Les vidéos volontairement retirées ne sont pas touchées : « pas de
    // vidéo » est une décision, pas un oubli.
    let rafraichis = 0;
    if (rafraichir) {
      const { rowCount } = await pool.query(
        `UPDATE reboot_exercises re
            SET vimeo_video_id = NULL
          WHERE re.video_suppressed = false
            AND re.vimeo_video_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM exercise_library el
               WHERE el.is_active = true
                 AND el.vimeo_video_id IS NOT NULL
                 AND el.vimeo_video_id IS DISTINCT FROM re.vimeo_video_id
                 AND ((re.library_exercise_id IS NOT NULL AND el.id = re.library_exercise_id)
                   OR (re.library_exercise_id IS NULL
                       AND LOWER(TRIM(el.name)) = LOWER(TRIM(re.name))))
            )`
      );
      rafraichis = rowCount ?? 0;
    }
    const { rows } = await pool.query<Ligne>(
      `SELECT rs.name AS seance,
              re.name AS exercice,
              re.vimeo_video_id AS copie,
              (re.library_exercise_id IS NOT NULL) AS lie,
              el.name  AS biblio_nom,
              el.vimeo_video_id AS biblio_video,
              re.video_suppressed AS supprimee
         FROM reboot_exercises re
         JOIN reboot_sessions rs ON rs.id = re.session_id
         LEFT JOIN LATERAL (
           SELECT el.name, el.vimeo_video_id
             FROM exercise_library el
            WHERE el.is_active = true
              AND ((re.library_exercise_id IS NOT NULL AND el.id = re.library_exercise_id)
                OR (re.library_exercise_id IS NULL
                    AND LOWER(TRIM(el.name)) = LOWER(TRIM(re.name))))
            ORDER BY (el.vimeo_video_id IS NOT NULL) DESC, el.created_at ASC
            LIMIT 1
         ) el ON TRUE
        WHERE rs.is_active
        ORDER BY rs.order_index, re.order_index`
    );

    const analysees = rows.map((l) => {
      const affichee = l.supprimee ? null : l.copie ?? l.biblio_video;

      let verdict: string;
      if (l.supprimee) {
        verdict = "vidéo retirée volontairement";
      } else if (!l.biblio_nom) {
        verdict = l.lie
          ? "rattaché à un exercice de bibliothèque introuvable ou désactivé"
          : "AUCUNE correspondance dans la bibliothèque — le nom ne colle pas exactement";
      } else if (l.copie && l.biblio_video && l.copie !== l.biblio_video) {
        verdict = "COPIE PÉRIMÉE — la séance montre son ancienne vidéo, pas celle de la bibliothèque";
      } else if (!affichee) {
        verdict = "aucune vidéo, ni dans la séance ni dans la bibliothèque";
      } else {
        verdict = "ok";
      }

      return {
        seance: l.seance,
        exercice: l.exercice,
        vidéoAffichée: affichee,
        copieDansLaSéance: l.copie,
        vidéoDeLaBibliothèque: l.biblio_video,
        rattachéÀ: l.biblio_nom,
        parIdentifiant: l.lie,
        verdict,
      };
    });

    const problemes = analysees.filter((a) => a.verdict !== "ok" && !a.verdict.startsWith("vidéo retirée"));
    const perimees = problemes.filter((p) => p.verdict.startsWith("COPIE PÉRIMÉE")).length;
    const sansCorrespondance = problemes.filter((p) => p.verdict.startsWith("AUCUNE")).length;

    return jsonUtf8({
      ...(rafraichir ? { rafraîchis: `${rafraichis} exercice(s) réalignés sur la bibliothèque` } : {}),
      résumé: {
        exercices: analysees.length,
        àCorriger: problemes.length,
        copiesPérimées: perimees,
        sansCorrespondanceBibliothèque: sansCorrespondance,
      },
      quoiFaire:
        perimees > 0
          ? "Des séances montrent une ancienne vidéo. Ajoute &rafraichir=1 pour aligner les séances sur la bibliothèque."
          : sansCorrespondance > 0
            ? "Ces exercices ne correspondent à aucun nom de la bibliothèque. Renomme-les à l'identique, ou rattache-les depuis le CRM."
            : "Rien à corriger.",
      exercices: seulementProblemes ? problemes : analysees,
    });
  } catch (err) {
    console.error("[stats/videos-reboot]", err);
    return jsonUtf8({ error: String(err) }, { status: 500 });
  }
}
