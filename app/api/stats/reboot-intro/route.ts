import { NextRequest } from "next/server";
import { jsonUtf8 } from "@/lib/json-utf8";
import { pool } from "@/lib/db";

/**
 * Pourquoi la vidéo d'introduction ne s'affiche pas.
 *
 * Quatre causes donnent le même résultat — rien ne change dans l'app — et
 * appellent quatre gestes différents : le réglage n'est pas enregistré, le
 * participant n'est pas marqué Reboot, il a déjà vu la vidéo, ou le
 * déploiement n'est pas passé. Sans cette réponse, on les essaie une par une.
 *
 * Le commit déployé est renvoyé aussi : savoir quelle version répond évite de
 * chercher un bug dans du code qui n'est pas en ligne.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return jsonUtf8({ error: "Unauthorized" }, { status: 401 });
  }

  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  // Permet de régler la vidéo sans passer par le CRM. Le réglage y a sa place
  // normale, mais le CRM est une autre application, déployée séparément : en
  // dépendre pour débloquer l'app cliente ajoute une panne possible là où il
  // n'en faut aucune. Même secret, même exigence.
  const aDefinir = (req.nextUrl.searchParams.get("definir") ?? "").trim();
  // Remise à zéro du visionnage, pour le compte désigné par &email. Le coach
  // doit pouvoir revoir la porte après l'avoir franchie une fois : sans ça,
  // vérifier un changement d'affichage demande de créer un compte jetable à
  // chaque essai.
  const rejouer = req.nextUrl.searchParams.get("rejouer") === "1";

  try {
    if (aDefinir) {
      // Le coach colle l'adresse complète plutôt que l'identifiant : on en
      // extrait la première suite longue de chiffres. « vide » efface le
      // réglage et rend le challenge accessible sans vidéo.
      const identifiant = aDefinir === "vide" ? "" : (aDefinir.match(/(\d{6,})/)?.[1] ?? "");
      if (aDefinir !== "vide" && !identifiant) {
        return jsonUtf8(
          { error: "Aucun identifiant Vimeo trouvé dans ce qui a été fourni.", reçu: aDefinir },
          { status: 400 }
        );
      }
      await pool.query(
        `CREATE TABLE IF NOT EXISTS app_settings (
           key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT now()
         )`
      );
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('reboot_intro_video_id', $1, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [identifiant]
      );
    }
    const { rows: reglage } = await pool
      .query<{ value: string; updated_at: Date }>(
        `SELECT value, updated_at FROM app_settings WHERE key = 'reboot_intro_video_id'`
      )
      .catch(() => ({ rows: [] as { value: string; updated_at: Date }[] }));

    const videoId = (reglage[0]?.value ?? "").trim();

    const base = {
      commitDéployé: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "inconnu",
      vidéoRéglée: videoId || "aucune",
      régléeLe: reglage[0]?.updated_at ?? null,
    };

    if (!videoId) {
      return jsonUtf8({
        ...base,
        diagnostic:
          "Aucun identifiant enregistré. Dans le CRM, Paramètres, colle le lien Vimeo " +
          "dans « Vidéo d'explication du Reboot » et clique sur Enregistrer. " +
          "Si le champ n'existe pas sur cette page, c'est le CRM qui n'est pas déployé.",
      });
    }

    if (!email) {
      return jsonUtf8({
        ...base,
        diagnostic:
          "La vidéo est réglée. Ajoute &email=ton@adresse pour savoir si un compte précis doit la voir.",
      });
    }

    let remiseAZero: string | null = null;
    if (rejouer) {
      const { rowCount } = await pool
        .query(
          `DELETE FROM reboot_intro_views
           WHERE client_id = (SELECT id FROM clients WHERE email = $1)`,
          [email]
        )
        .catch(() => ({ rowCount: 0 }));
      remiseAZero =
        (rowCount ?? 0) > 0
          ? "Visionnage effacé : la vidéo sera redemandée à la prochaine ouverture."
          : "Rien à effacer : ce compte n'avait pas de visionnage enregistré.";
    }

    const { rows } = await pool.query<{ id: string; is_reboot_only: boolean; vue: boolean }>(
      `SELECT c.id::text AS id, c.is_reboot_only,
              EXISTS (
                SELECT 1 FROM reboot_intro_views v WHERE v.client_id = c.id
              ) AS vue
       FROM clients c WHERE c.email = $1`,
      [email]
    );

    const compte = rows[0];
    if (!compte) {
      return jsonUtf8({ ...base, email, diagnostic: "Aucun compte à cette adresse exacte." });
    }

    return jsonUtf8({
      ...base,
      email,
      ...(remiseAZero ? { remiseÀZéro: remiseAZero } : {}),
      participantReboot: compte.is_reboot_only,
      vidéoDéjàVue: compte.vue,
      diagnostic: !compte.is_reboot_only
        ? "Ce compte n'est pas marqué « Reboot only ». La vidéo ne concerne que les participants : coche la case sur sa fiche."
        : compte.vue
          ? "Ce compte a déjà vu la vidéo, elle ne se redemande donc pas. Ajoute &rejouer=1 à cette adresse pour effacer le visionnage et la revoir."
          : "Ce compte doit voir la vidéo à sa prochaine ouverture de l'app. S'il ne la voit pas, ferme et rouvre complètement l'application.",
    });
  } catch (err) {
    console.error("[stats/reboot-intro]", err);
    return jsonUtf8({ error: String(err) }, { status: 500 });
  }
}
