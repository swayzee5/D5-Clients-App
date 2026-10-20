import { pool } from "@/lib/db";

/**
 * Les photos de progression : face, dos, profil.
 *
 * Pourquoi elles comptent plus que la balance, pour ce public : un homme de
 * quarante-cinq ans qui reprend perd du gras et prend du muscle en même temps.
 * Son poids ne bouge pas pendant six semaines, il en conclut que rien ne
 * marche, et il arrête — au moment précis où son corps commence à changer. La
 * photo est le seul instrument qui ne ment pas là-dessus.
 *
 * La table existait depuis le premier schéma et n'a jamais été utilisée. Deux
 * ajustements : le chemin de stockage privé remplace l'adresse publique prévue
 * à l'origine, et la contrainte d'obligation sur cette adresse est levée.
 * Aucune ligne n'existe, l'opération est sans risque.
 *
 * Les photos sont rattachées à une entrée de progression, donc à une date.
 * C'est ce qui fait qu'un poids, des mensurations et des photos du même jour
 * se lisent ensemble plutôt que côte à côte sans rapport.
 */

/**
 * Les trois angles, plus la vidéo.
 *
 * La vidéo partage la table parce qu'elle partage tout le reste : une date,
 * un client, un chemin de stockage privé. Elle ne remplace pas les photos —
 * deux vidéos ne se comparent pas, on ne peut pas les figer au même instant
 * sous le même angle. Les photos servent au client à voir son évolution, la
 * vidéo sert au coach comme preuve difficile à fabriquer.
 */
export type AnglePhoto = "front" | "back" | "side" | "video";

export const ANGLES: { cle: AnglePhoto; label: string; consigne: string }[] = [
  { cle: "front", label: "De face", consigne: "Bras le long du corps, pieds écartés largeur de bassin." },
  { cle: "side", label: "De profil", consigne: "Bras le long du corps, regard droit devant." },
  { cle: "back", label: "De dos", consigne: "Même position que de face, dos à l'objectif." },
];

/** La vidéo est présentée à part : facultative, et d'une autre nature. */
export const VIDEO: { cle: AnglePhoto; label: string; consigne: string } = {
  cle: "video",
  label: "Vidéo de rotation",
  consigne: "Quinze secondes, un tour complet sur toi-même, lentement.",
};

export type PhotoProgression = {
  id: string;
  angle: AnglePhoto;
  date: string;
  cheminPhoto: string;
};

let pret = false;

async function ensureSchema(): Promise<void> {
  if (pret) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS progress_photos (
      id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      progress_entry_id UUID        NOT NULL REFERENCES progress_entries(id) ON DELETE CASCADE,
      photo_url         TEXT,
      photo_type        VARCHAR(20) CHECK (photo_type IN ('front', 'back', 'side')),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Le chemin privé remplace l'adresse publique du schéma d'origine.
  await pool.query(`ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS photo_path TEXT`);
  await pool.query(`ALTER TABLE progress_photos ALTER COLUMN photo_url DROP NOT NULL`).catch(() => {});
  // La contrainte d'origine n'admettait que les trois angles. Elle est
  // reconstruite pour accepter la vidéo — le nom est celui que PostgreSQL
  // donne par défaut à une contrainte de colonne.
  await pool
    .query(`ALTER TABLE progress_photos DROP CONSTRAINT IF EXISTS progress_photos_photo_type_check`)
    .catch(() => {});
  await pool
    .query(
      `ALTER TABLE progress_photos ADD CONSTRAINT progress_photos_photo_type_check
         CHECK (photo_type IN ('front', 'back', 'side', 'video'))`
    )
    .catch(() => {});
  // Une seule photo par angle et par date : reprendre sa photo de face
  // remplace la précédente du jour au lieu d'en empiler deux.
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS progress_photos_angle_idx
       ON progress_photos (progress_entry_id, photo_type)`
  );
  pret = true;
}

/**
 * L'entrée de progression du jour, créée si besoin.
 *
 * Une photo sans entrée n'a pas de date, donc pas de comparaison possible.
 * `ON CONFLICT` plutôt qu'un test préalable : deux angles envoyés coup sur
 * coup créeraient sinon deux entrées pour le même jour.
 */
async function entreeDuJour(clientId: string, date: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO progress_entries (client_id, entry_date)
     VALUES ($1::uuid, $2::date)
     ON CONFLICT (client_id, entry_date) DO UPDATE SET entry_date = EXCLUDED.entry_date
     RETURNING id::text AS id`,
    [clientId, date]
  );
  return rows[0].id;
}

/** Enregistre une photo, en remplaçant celle du même angle et du même jour. */
export async function enregistrerPhoto(valeurs: {
  clientId: string;
  date: string;
  angle: AnglePhoto;
  cheminPhoto: string;
}): Promise<{ remplace: string | null }> {
  await ensureSchema();
  const entreeId = await entreeDuJour(valeurs.clientId, valeurs.date);

  // L'ancien chemin est lu AVANT la mise à jour : un RETURNING rendrait la
  // nouvelle valeur, et le fichier remplacé resterait dans le stockage sans
  // que rien ne le référence.
  const { rows: avant } = await pool.query<{ photo_path: string | null }>(
    `SELECT photo_path FROM progress_photos
      WHERE progress_entry_id = $1::uuid AND photo_type = $2`,
    [entreeId, valeurs.angle]
  );
  const ancien = avant[0]?.photo_path ?? null;

  await pool.query(
    `INSERT INTO progress_photos (progress_entry_id, photo_type, photo_path)
     VALUES ($1::uuid, $2, $3)
     ON CONFLICT (progress_entry_id, photo_type)
     DO UPDATE SET photo_path = EXCLUDED.photo_path, created_at = NOW()`,
    [entreeId, valeurs.angle, valeurs.cheminPhoto]
  );

  return { remplace: ancien && ancien !== valeurs.cheminPhoto ? ancien : null };
}

/** Toutes les photos d'un client, de la plus récente à la plus ancienne. */
export async function listerPhotos(clientId: string): Promise<PhotoProgression[]> {
  await ensureSchema();
  const { rows } = await pool.query<{
    id: string;
    photo_type: AnglePhoto;
    jour: string;
    photo_path: string;
  }>(
    `SELECT pp.id::text AS id, pp.photo_type,
            to_char(pe.entry_date, 'YYYY-MM-DD') AS jour,
            pp.photo_path
       FROM progress_photos pp
       JOIN progress_entries pe ON pe.id = pp.progress_entry_id
      WHERE pe.client_id = $1::uuid AND pp.photo_path IS NOT NULL
      ORDER BY pe.entry_date DESC, pp.photo_type`,
    [clientId]
  );
  return rows.map((r) => ({
    id: r.id,
    angle: r.photo_type,
    date: r.jour,
    cheminPhoto: r.photo_path,
  }));
}

/** Une photo et son propriétaire, pour contrôler l'accès au fichier. */
export async function getPhoto(
  id: string
): Promise<{ clientId: string; cheminPhoto: string } | null> {
  await ensureSchema();
  const { rows } = await pool.query<{ client_id: string; photo_path: string | null }>(
    `SELECT pe.client_id::text AS client_id, pp.photo_path
       FROM progress_photos pp
       JOIN progress_entries pe ON pe.id = pp.progress_entry_id
      WHERE pp.id = $1::uuid`,
    [id]
  );
  const l = rows[0];
  if (!l?.photo_path) return null;
  return { clientId: l.client_id, cheminPhoto: l.photo_path };
}

/**
 * La première et la dernière photo de chaque angle.
 *
 * C'est la seule vue qui compte. Une galerie chronologique dilue l'écart —
 * entre deux clichés consécutifs, à un mois d'intervalle, on ne voit rien ;
 * entre le premier et le dernier, on voit tout.
 */
export type Comparaison = {
  angle: AnglePhoto;
  label: string;
  premiere: PhotoProgression;
  derniere: PhotoProgression | null;
};

export function comparer(photos: PhotoProgression[]): Comparaison[] {
  // Seulement les angles photo : la vidéo ne se compare pas côte à côte.
  return ANGLES.map(({ cle, label }) => {
    // listerPhotos rend du plus récent au plus ancien.
    const duType = photos.filter((p) => p.angle === cle);
    if (duType.length === 0) return null;
    const derniere = duType[0];
    const premiere = duType[duType.length - 1];
    return {
      angle: cle,
      label,
      premiere,
      derniere: derniere.id === premiere.id ? null : derniere,
    };
  }).filter((c): c is Comparaison => c !== null);
}
