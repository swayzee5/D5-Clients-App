import { pool } from "@/lib/db";
import type { AnalyseRepas } from "@/lib/analyse-repas";

/**
 * Le journal des repas, côté lecture.
 *
 * Le statut est calculé ici et nulle part ailleurs. Il tient en trois états,
 * et c'est volontaire : « envoyé », « vu », « répondu ». Un quatrième état
 * aurait demandé au client de comprendre une nuance dont il n'a rien à faire.
 *
 * Les tables sont créées à la volée comme ailleurs dans ce projet : les deux
 * applications se partagent une base sans outil de migration commun, et une
 * page qui échoue parce qu'une table manque est le défaut le plus fréquent
 * qu'on ait eu à corriger.
 */

/**
 * La colonne de l'analyse s'appelle `analyse_auto` en base, et non `analyse` :
 * ANALYSE est un mot réservé de PostgreSQL — l'orthographe britannique
 * d'ANALYZE — et la création de la table échouait sur une erreur de syntaxe
 * sans rapport apparent avec le nom choisi. Les requêtes la renomment en
 * `analyse` à la lecture, pour que le reste du code ignore ce détail.
 */

export type StatutRepas = "envoye" | "vu" | "repondu";

export type Repas = {
  id: string;
  photoPath: string;
  noteClient: string | null;
  analyse: AnalyseRepas | null;
  coachSeenAt: Date | null;
  coachReply: string | null;
  coachRepliedAt: Date | null;
  createdAt: Date;
  statut: StatutRepas;
};

let tablePrete = false;

/**
 * Crée la table si besoin. Mémoïsé : sans ça, chaque affichage du journal
 * repayait un aller-retour pour un ordre qui ne fait rien.
 */
export async function ensureJournalRepas(): Promise<void> {
  if (tablePrete) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meal_logs (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      photo_path       TEXT NOT NULL,
      note_client      TEXT,
      analyse_auto     JSONB,
      analyse_erreur   TEXT,
      coach_seen_at    TIMESTAMPTZ,
      coach_reply      TEXT,
      coach_replied_at TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS meal_logs_attente_idx
       ON meal_logs (created_at) WHERE coach_replied_at IS NULL`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS meal_logs_client_idx
       ON meal_logs (client_id, created_at DESC)`
  );
  tablePrete = true;
}

type Ligne = {
  id: string;
  photo_path: string;
  note_client: string | null;
  analyse: AnalyseRepas | null;
  coach_seen_at: Date | null;
  coach_reply: string | null;
  coach_replied_at: Date | null;
  created_at: Date;
};

function versRepas(l: Ligne): Repas {
  return {
    id: l.id,
    photoPath: l.photo_path,
    noteClient: l.note_client,
    analyse: l.analyse,
    coachSeenAt: l.coach_seen_at,
    coachReply: l.coach_reply,
    coachRepliedAt: l.coach_replied_at,
    createdAt: l.created_at,
    statut: l.coach_replied_at ? "repondu" : l.coach_seen_at ? "vu" : "envoye",
  };
}

/** Les repas d'un client, du plus récent au plus ancien. */
export async function listerRepas(clientId: string, limite = 40): Promise<Repas[]> {
  await ensureJournalRepas();
  const { rows } = await pool.query<Ligne>(
    `SELECT id::text AS id, photo_path, note_client, analyse_auto AS analyse, coach_seen_at,
            coach_reply, coach_replied_at, created_at
       FROM meal_logs
      WHERE client_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2`,
    [clientId, limite]
  );
  return rows.map(versRepas);
}

/** Un repas précis, et son propriétaire — pour contrôler l'accès à la photo. */
export async function getRepas(id: string): Promise<(Repas & { clientId: string }) | null> {
  await ensureJournalRepas();
  const { rows } = await pool.query<Ligne & { client_id: string }>(
    `SELECT id::text AS id, client_id::text AS client_id, photo_path, note_client,
            analyse_auto AS analyse, coach_seen_at, coach_reply, coach_replied_at, created_at
       FROM meal_logs WHERE id = $1::uuid`,
    [id]
  );
  const l = rows[0];
  return l ? { ...versRepas(l), clientId: l.client_id } : null;
}

/** Enregistre un repas. L'analyse peut être absente, le repas part quand même. */
export async function enregistrerRepas(valeurs: {
  clientId: string;
  photoPath: string;
  noteClient?: string | null;
  analyse: AnalyseRepas | null;
  analyseErreur: string | null;
}): Promise<string> {
  await ensureJournalRepas();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO meal_logs (client_id, photo_path, note_client, analyse_auto, analyse_erreur)
     VALUES ($1::uuid, $2, $3, $4, $5)
     RETURNING id::text AS id`,
    [
      valeurs.clientId,
      valeurs.photoPath,
      valeurs.noteClient?.trim() || null,
      valeurs.analyse ? JSON.stringify(valeurs.analyse) : null,
      valeurs.analyseErreur,
    ]
  );
  return rows[0].id;
}

/**
 * Combien de repas attendent encore une réponse, et depuis quand.
 *
 * C'est le chiffre qui dit au coach s'il est en train de délaisser quelqu'un.
 * Il sert au tableau de bord du CRM et à l'alerte quotidienne.
 */
export async function repasEnAttente(): Promise<{ total: number; plusAncien: Date | null }> {
  await ensureJournalRepas();
  const { rows } = await pool.query<{ total: string; plus_ancien: Date | null }>(
    `SELECT COUNT(*)::text AS total, MIN(created_at) AS plus_ancien
       FROM meal_logs WHERE coach_replied_at IS NULL`
  );
  return {
    total: parseInt(rows[0]?.total ?? "0", 10),
    plusAncien: rows[0]?.plus_ancien ?? null,
  };
}
