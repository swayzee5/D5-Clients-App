import { NextRequest } from "next/server";
import { jsonUtf8 } from "@/lib/json-utf8";
import { pool } from "@/lib/db";
import {
  ALL_SLUGS,
  STRENGTH_SESSIONS,
  VIDEO_SESSIONS,
  isBonusTab,
  type PinnedExercise,
  type StrengthDef,
  type VideoDef,
} from "@/lib/reboot-catalogue";

/**
 * Construit la section « séances » du Reboot 40 depuis la bibliothèque
 * d'exercices.
 *
 * Ce que cette route corrige
 * --------------------------
 * La version précédente copiait chaque séance depuis un modèle du CRM cherché
 * par nom exact. Les noms cherchés n'existaient pas, donc aucun exercice
 * n'était copié — mais la séance était créée quand même, vide, et le « on
 * saute ce qui existe déjà » la condamnait à le rester.
 *
 * Ici les exercices viennent directement de exercise_library, en ne retenant
 * que ceux qui ont une vidéo, et une séance trop maigre est reconstruite au
 * lieu d'être sautée.
 *
 * Relancer la route est sans effet sur une séance déjà complète : rien n'est
 * touché. Elle peut donc être appelée après chaque ajout de vidéos dans la
 * bibliothèque, pour que les séances en profitent.
 *
 * `?reset=1` force la reconstruction de toutes les séances. Les validations des
 * participants (reboot_completions) ne sont jamais touchées.
 */

/**
 * La reconstruction complète dépasse le budget par défaut d'une fonction
 * serveur. Sans ce réglage, l'appel est coupé en plein travail et rend
 * « Connection terminated », ce qui ressemble à une panne de base alors que
 * c'est une limite de temps.
 */
export const maxDuration = 60;

type LibraryRow = { id: string; name: string; vimeo_video_id: string };

/** Exercice résolu, avec la prescription qui l'accompagne. */
type Prescrit = LibraryRow & {
  sets?: number;
  reps?: string;
  restSeconds?: number;
  notes?: string;
};

async function ensureSchema(): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS reboot_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL,
    muscle_group TEXT NOT NULL, location TEXT NOT NULL DEFAULT 'salle',
    description TEXT, duration_minutes INT, order_index INT NOT NULL DEFAULT 0
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS reboot_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES reboot_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL, sets INT, reps TEXT, rest_seconds INT,
    vimeo_video_id TEXT, order_index INT DEFAULT 0, notes TEXT
  )`);

  // Migration 004 rejouée ici : le dépôt a des migrations mais rien qui les
  // applique, et le reste de l'app procède déjà ainsi.
  await pool.query(`ALTER TABLE reboot_sessions ADD COLUMN IF NOT EXISTS slug      TEXT`);
  await pool.query(`ALTER TABLE reboot_sessions ADD COLUMN IF NOT EXISTS tab       TEXT NOT NULL DEFAULT 'salle'`);
  await pool.query(`ALTER TABLE reboot_sessions ADD COLUMN IF NOT EXISTS is_bonus  BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE reboot_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS reboot_sessions_slug_key ON reboot_sessions (slug)`);
  await pool.query(`ALTER TABLE reboot_exercises ADD COLUMN IF NOT EXISTS library_exercise_id UUID`);
  await pool.query(`ALTER TABLE reboot_exercises ADD COLUMN IF NOT EXISTS video_suppressed BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE reboot_sessions ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN NOT NULL DEFAULT false`);
}

/**
 * Toute la bibliothèque en mémoire, en une requête.
 *
 * Chaque exercice était cherché par son propre aller-retour : dix-sept séances
 * de six exercices font une centaine d'interrogations, et la route finissait
 * par dépasser son temps. Le catalogue tient en quelques centaines de lignes,
 * autant le lire d'un coup.
 *
 * La clé est le nom normalisé — minuscules, espaces retirés aux extrémités —
 * puisque c'est ainsi que les séances y font référence. À noms égaux, celui
 * qui a une vidéo l'emporte : un doublon sans vidéo ne doit pas masquer
 * l'entrée utile.
 */
async function chargerBibliotheque(): Promise<Map<string, LibraryRow>> {
  const { rows } = await pool.query<LibraryRow>(
    `SELECT id::text AS id, name, vimeo_video_id
     FROM exercise_library
     WHERE is_active = true
     ORDER BY (vimeo_video_id IS NOT NULL) DESC, created_at ASC`
  );
  const index = new Map<string, LibraryRow>();
  for (const row of rows) {
    const cle = row.name.trim().toLowerCase();
    if (!index.has(cle)) index.set(cle, row);
  }
  return index;
}

/** Les réglages propres à un exercice, quand le coach en a fixé. */
function prescription(entry: PinnedExercise) {
  return {
    sets: entry.sets,
    reps: entry.reps,
    restSeconds: entry.restSeconds,
    notes: entry.notes,
  };
}

/**
 * Résout une liste imposée par le coach, dans son ordre.
 *
 * Chaque nom est cherché tel quel, à la casse et aux espaces près. Un nom
 * introuvable, ou sans vidéo alors qu'elle est exigée, n'est pas inséré : il
 * ressort dans le rapport. Une liste écrite à la main contient tôt ou tard une
 * faute de frappe, et un exercice qui disparaît sans un mot est bien pire
 * qu'un exercice signalé.
 */
async function resolvePinned(
  pinned: PinnedExercise[],
  bibliotheque: Map<string, LibraryRow>
): Promise<{ picked: Prescrit[]; problemes: string[] }> {
  const picked: Prescrit[] = [];
  const problemes: string[] = [];
  /** Video -> premier exercice de la liste qui l'utilise. */
  const dejaVues = new Map<string, string>();

  for (const entry of pinned) {
    const found = bibliotheque.get(entry.name.trim().toLowerCase()) ?? null;

    if (!found) {
      // Quand le coach a fourni l'identifiant de la vidéo, l'entrée de
      // bibliothèque n'apporte plus rien : on a le nom et la démonstration.
      // Nettoyer la bibliothèque ne doit pas faire disparaître un exercice
      // d'une séance en cours.
      if (entry.videoId) {
        dejaVues.set(entry.videoId, entry.name);
        picked.push({ ...prescription(entry), id: "", name: entry.name, vimeo_video_id: entry.videoId });
        continue;
      }
      problemes.push(`« ${entry.name} » introuvable dans la bibliothèque`);
      continue;
    }

    if (entry.videoId) {
      // Vidéo imposée : elle appartient à cet exercice, donc elle entre aussi
      // dans le registre des vidéos déjà prises.
      dejaVues.set(entry.videoId, found.name);
      picked.push({ ...prescription(entry), id: found.id, name: found.name, vimeo_video_id: entry.videoId });
      continue;
    }

    if (!found.vimeo_video_id && !entry.videoOptional) {
      problemes.push(`« ${entry.name} » sans vidéo`);
      continue;
    }

    // Une video deja prise par un exercice precedent de la meme seance n'est
    // pas la sienne : c'est la bibliotheque qui l'a attribuee deux fois.
    // L'exercice reste, sans demonstration, et le rapport le nomme.
    if (found.vimeo_video_id && dejaVues.has(found.vimeo_video_id)) {
      const proprietaire = dejaVues.get(found.vimeo_video_id);
      problemes.push(
        `« ${entry.name} » affiché sans vidéo : la bibliothèque lui donne celle de « ${proprietaire} »`
      );
      picked.push({ ...prescription(entry), id: found.id, name: found.name, vimeo_video_id: "" });
      continue;
    }
    if (found.vimeo_video_id) dejaVues.set(found.vimeo_video_id, found.name);
    picked.push({ ...prescription(entry), ...found });
  }

  return { picked, problemes };
}

/**
 * La vidéo d'un échauffement, d'un étirement ou d'un HIIT, si elle existe.
 *
 * Cherchée dans la bibliothèque déjà chargée : les fragments doivent
 * apparaître dans cet ordre dans le nom. À plusieurs candidates, la plus
 * courte gagne — « Échauffement full body 1 » plutôt que « Échauffement full
 * body 1 et 2 ».
 */
function findVideo(def: VideoDef, bibliotheque: Map<string, LibraryRow>): LibraryRow | null {
  const fragments = def.match.map((m) => m.toLowerCase());
  const candidates = Array.from(bibliotheque.values()).filter((row) => {
    if (!row.vimeo_video_id) return false;
    let position = 0;
    for (const fragment of fragments) {
      const trouve = row.name.toLowerCase().indexOf(fragment, position);
      if (trouve === -1) return false;
      position = trouve + fragment.length;
    }
    return true;
  });
  candidates.sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name));
  return candidates[0] ?? null;
}

type SessionRow = {
  id: string;
  exercise_count: number;
  library_ids: string[];
  manually_edited: boolean;
};

async function findSession(slug: string): Promise<SessionRow | null> {
  const { rows } = await pool.query<SessionRow>(
    `SELECT rs.id::text AS id,
            rs.manually_edited,
            (SELECT COUNT(*)::int FROM reboot_exercises WHERE session_id = rs.id) AS exercise_count,
            COALESCE(
              (SELECT ARRAY_AGG(library_exercise_id::text)
               FROM reboot_exercises WHERE session_id = rs.id AND library_exercise_id IS NOT NULL),
              '{}'
            ) AS library_ids
     FROM reboot_sessions rs WHERE rs.slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}

type Upsert = {
  slug: string;
  name: string;
  muscleGroup: string;
  location: string;
  tab: string;
  description: string;
  durationMinutes: number;
  orderIndex: number;
};

async function upsertSession(s: Upsert): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO reboot_sessions
       (slug, name, muscle_group, location, tab, is_bonus, is_active,
        description, duration_minutes, order_index)
     VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9)
     ON CONFLICT (slug) DO UPDATE SET
       -- Reprise depuis le catalogue : la séance n'est plus une version
       -- retouchée à la main, et la marque doit tomber avec elle. La laisser
       -- ferait croire à un travail qui vient d'être écrasé.
       manually_edited = false,
       name = EXCLUDED.name,
       muscle_group = EXCLUDED.muscle_group,
       location = EXCLUDED.location,
       tab = EXCLUDED.tab,
       is_bonus = EXCLUDED.is_bonus,
       is_active = true,
       description = EXCLUDED.description,
       duration_minutes = EXCLUDED.duration_minutes,
       order_index = EXCLUDED.order_index
     RETURNING id::text AS id`,
    [
      s.slug, s.name, s.muscleGroup, s.location, s.tab,
      isBonusTab(s.tab as "salle"), s.description, s.durationMinutes, s.orderIndex,
    ]
  );
  return rows[0].id;
}

type Report = { slug: string; name: string; exercises: number; status: string; videos?: string[] };

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (secret !== expected) {
    // Un « Unauthorized » nu ne dit pas laquelle des trois causes s'applique :
    // la variable absente du déploiement, une valeur différente de celle
    // attendue, ou un caractère de trop copié avec. Les longueurs et le commit
    // déployé tranchent sans jamais révéler le secret lui-même.
    return jsonUtf8(
      {
        error: "Unauthorized",
        diagnostic: {
          variableDéfinieSurCeDéploiement: Boolean(expected),
          longueurAttendue: expected?.length ?? 0,
          longueurReçue: secret?.length ?? 0,
          commitDéployé: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "inconnu",
          indice: !expected
            ? "CRON_SECRET n'existe pas pour ce déploiement : mauvais projet Vercel, environnement Production non coché, ou redéploiement pas encore fait."
            : (secret?.length ?? 0) === 0
              ? "Aucun secret reçu dans l'URL."
              : expected.length === (secret?.length ?? 0)
                ? "Même longueur mais valeur différente : la variable modifiée n'est probablement pas celle du projet qui sert ce domaine."
                : "Longueurs différentes : espace, retour à la ligne ou caractère manquant dans ce qui a été collé.",
        },
      },
      { status: 401 }
    );
  }
  const reset = req.nextUrl.searchParams.get("reset") === "1";
  // Repartir du catalogue écrit dans le code, y compris pour les séances que
  // le coach a modifiées depuis le CRM. Volontairement séparé de « reset » :
  // écraser le travail de quelqu'un ne doit pas être un effet de bord.
  const force = req.nextUrl.searchParams.get("force") === "1";

  try {
    await ensureSchema();
    const bibliotheque = await chargerBibliotheque();

    const report: Report[] = [];
    let orderIndex = 0;

    for (const def of STRENGTH_SESSIONS) {
      orderIndex++;
      const existing = await findSession(def.slug);

      // Séance retouchée depuis le CRM : elle fait autorité, pas le catalogue.
      // Sans cette sortie, chaque appel du seed effacerait le travail du coach
      // sans rien dire, et il ne le découvrirait qu'en ouvrant l'app.
      if (existing?.manually_edited && !force) {
        report.push({
          slug: def.slug, name: def.name, exercises: existing.exercise_count,
          status: "modifiée dans le CRM — laissée telle quelle",
        });
        continue;
      }

      // Une séance déjà garnie n'est pas retouchée : les participants peuvent
      // être en train de la suivre, et rejouer la sélection changerait les
      // exercices sous leurs yeux.
      //
      // Sauf si le coach en a fixé le contenu : là, la liste est stable par
      // construction, et la rejouer est justement ce qui rattache une vidéo
      // ajoutée depuis le dernier passage.
      if (def.pinned) {
        const { picked, problemes } = await resolvePinned(def.pinned, bibliotheque);
        // Une séance amputée ne doit pas être publiée. Quand des noms ne
        // correspondent pas à la bibliothèque, il reste parfois un ou deux
        // exercices : « Dos & Biceps » avec un seul tirage est pire que pas de
        // séance du tout, parce que le participant croit que c'est le
        // programme prévu pour lui.
        if (picked.length > 0 && picked.length < 4) {
          if (existing) {
            await pool.query(`UPDATE reboot_sessions SET is_active = false WHERE slug = $1`, [def.slug]);
          }
          report.push({
            slug: def.slug, name: def.name, exercises: picked.length,
            videos: picked.map((e) => `${e.name} = ${e.vimeo_video_id || "aucune"}`),
            status: `masquée — ${picked.length} exercice(s) seulement : ${problemes.join(" ; ")}`,
          });
          continue;
        }
        if (picked.length === 0) {
          if (existing) {
            await pool.query(`UPDATE reboot_sessions SET is_active = false WHERE slug = $1`, [def.slug]);
          }
          report.push({
            slug: def.slug, name: def.name, exercises: 0,
            status: `masquée — aucun exercice de la liste imposée n'a pu être résolu : ${problemes.join(" ; ")}`,
          });
          continue;
        }

        const sessionId = await upsertSession({
          slug: def.slug, name: def.name, muscleGroup: def.muscleGroup,
          location: def.tab, tab: def.tab, description: def.description,
          durationMinutes: def.durationMinutes, orderIndex,
        });
        await pool.query(`DELETE FROM reboot_exercises WHERE session_id = $1`, [sessionId]);
        // Une seule requête pour toute la séance. Une insertion par exercice
        // multipliait les allers-retours par six, et c'est ce qui faisait
        // dépasser le temps imparti à la route.
        if (picked.length > 0) {
          const valeurs: unknown[] = [];
          const lignes = picked.map((e, i) => {
            const d = i * 9;
            valeurs.push(
              sessionId,
              e.id || null,
              e.name,
              e.vimeo_video_id || null,
              // Sans ce drapeau, l'affichage retrouverait la vidéo par le nom
              // et la ferait revenir : couper le lien ne suffit pas.
              e.vimeo_video_id === "",
              e.sets ?? def.sets,
              e.reps ?? def.reps,
              e.restSeconds ?? def.restSeconds,
              e.notes ?? null
            );
            return `($${d + 1},$${d + 2},$${d + 3},$${d + 4},$${d + 5},$${d + 6},$${d + 7},$${d + 8},$${d + 9},${i})`;
          });
          await pool.query(
            `INSERT INTO reboot_exercises
               (session_id, library_exercise_id, name, vimeo_video_id,
                video_suppressed, sets, reps, rest_seconds, notes, order_index)
             VALUES ${lignes.join(",")}`,
            valeurs
          );
        }
        const sansVideo = picked.filter((e) => !e.vimeo_video_id).map((e) => e.name);
        report.push({
          slug: def.slug, name: def.name, exercises: picked.length,
          // Le detail des videos est remonte tel quel : c'est ce qui permet de
          // voir en un coup d'oeil que deux exercices partagent la meme, ce
          // qu'aucun ecran ne montre autrement.
          videos: picked.map((e) => `${e.name} = ${e.vimeo_video_id || "aucune"}`),
          status: [
            "liste imposée",
            problemes.length ? `non retenus : ${problemes.join(" ; ")}` : null,
            sansVideo.length ? `sans vidéo : ${sansVideo.join(", ")}` : null,
          ].filter(Boolean).join(" — "),
        });
        continue;
      }

      // Toutes les séances sont écrites à la main. Une séance sans liste est
      // une erreur de catalogue, pas un cas à rattraper en devinant.
      report.push({
        slug: def.slug, name: def.name, exercises: 0,
        status: "masquée — aucune liste d'exercices définie dans le catalogue",
      });
      if (existing) {
        await pool.query(`UPDATE reboot_sessions SET is_active = false WHERE slug = $1`, [def.slug]);
      }
    }

    for (const def of VIDEO_SESSIONS) {
      orderIndex++;
      const video = findVideo(def, bibliotheque);
      const existingVideo = await findSession(def.slug);

      if (existingVideo?.manually_edited && !force) {
        report.push({
          slug: def.slug, name: def.name, exercises: existingVideo.exercise_count,
          status: "modifiée dans le CRM — laissée telle quelle",
        });
        continue;
      }

      if (video && !reset && existingVideo?.library_ids.length === 1 && existingVideo.library_ids[0] === video.id) {
        // Déjà reliée à cette vidéo : ne rien réécrire. Sans cette sortie, la
        // ligne était supprimée puis recréée à chaque passage.
        report.push({ slug: def.slug, name: video.name, exercises: 1, status: "inchangée" });
        continue;
      }

      if (!video) {
        const existing = existingVideo;
        if (existing) {
          await pool.query(`UPDATE reboot_sessions SET is_active = false WHERE slug = $1`, [def.slug]);
        }
        report.push({
          slug: def.slug, name: def.name, exercises: 0,
          status: `masquée — aucune vidéo trouvée pour « ${def.match.join(" … ")} »`,
        });
        continue;
      }

      const sessionId = await upsertSession({
        slug: def.slug, name: def.name, muscleGroup: def.tab,
        location: def.tab === "hiit" ? "maison" : "salle", tab: def.tab,
        description: def.description, durationMinutes: def.durationMinutes,
        orderIndex,
      });

      await pool.query(`DELETE FROM reboot_exercises WHERE session_id = $1`, [sessionId]);
      await pool.query(
        `INSERT INTO reboot_exercises
           (session_id, library_exercise_id, name, vimeo_video_id, sets, reps, rest_seconds, order_index)
         VALUES ($1,$2,$3,$4,NULL,$5,NULL,0)`,
        [sessionId, video.id, video.name, video.vimeo_video_id, def.instruction]
      );
      report.push({ slug: def.slug, name: video.name, exercises: 1, status: "vidéo liée" });
    }

    // Tout ce qui n'est plus au catalogue disparaît de l'app : les anciennes
    // séances genrées, et celles créées vides par l'ancien seed (slug NULL).
    const { rowCount: retired } = await pool.query(
      `UPDATE reboot_sessions SET is_active = false
       WHERE is_active = true AND (slug IS NULL OR NOT (slug = ANY($1::text[])))`,
      [ALL_SLUGS]
    );

    // Une meme video attribuee a plusieurs exercices differents est une erreur
    // de la bibliotheque, pas de la selection. Elle est invisible tant qu'on
    // regarde les exercices un par un : elle ne saute aux yeux que dans une
    // seance, ou trois vignettes identiques se suivent.
    const { rows: videosPartagees } = await pool.query<{ video: string; exercices: string[] }>(
      `SELECT el.vimeo_video_id AS video,
              ARRAY_AGG(DISTINCT el.name ORDER BY el.name) AS exercices
       FROM exercise_library el
       WHERE el.is_active = true AND el.vimeo_video_id IS NOT NULL
         AND EXISTS (SELECT 1 FROM reboot_exercises re WHERE re.library_exercise_id = el.id)
       GROUP BY el.vimeo_video_id
       HAVING COUNT(DISTINCT el.id) > 1
       ORDER BY COUNT(DISTINCT el.id) DESC`
    );

    const published = report.filter((r) => r.exercises >= 1 && !r.status.startsWith("masquée"));
    return jsonUtf8({
      ok: true,
      videosPartagées: videosPartagees.length
        ? videosPartagees.map((v) => `vidéo ${v.video} attribuée à : ${v.exercices.join(", ")}`)
        : "aucune vidéo utilisée par deux exercices différents",
      publiées: published.length,
      masquées: report.length - published.length,
      anciennesRetirées: retired ?? 0,
      détail: report,
    });
  } catch (err) {
    console.error("[seed/reboot]", err);
    return jsonUtf8({ error: String(err) }, { status: 500 });
  }
}
