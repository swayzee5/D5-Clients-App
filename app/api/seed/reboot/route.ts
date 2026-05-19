import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const SESSIONS = [
  {
    muscle_group: "pecs",
    location: "salle",
    name: "Pectoraux — Salle",
    description: "Séance poitrine complète avec équipement. Objectif : activation musculaire et gainage.",
    duration_minutes: 45,
    order_index: 1,
    exercises: [
      { name: "Développé couché haltères", sets: 3, reps: "10", rest_seconds: 90, order_index: 1, notes: "Descends lentement, coudes à 45°" },
      { name: "Écarté haltères allongé", sets: 3, reps: "12", rest_seconds: 60, order_index: 2, notes: "Amplitude contrôlée, ne verrouille pas les coudes" },
      { name: "Dips entre bancs", sets: 3, reps: "10", rest_seconds: 75, order_index: 3, notes: "Garde le dos proche du banc" },
      { name: "Pompes prisé large", sets: 3, reps: "12", rest_seconds: 60, order_index: 4, notes: "Gainage actif, ne creuse pas les lombaires" },
    ],
  },
  {
    muscle_group: "pecs",
    location: "maison",
    name: "Pectoraux — Maison",
    description: "Séance poitrine sans matériel. Efficace avec le seul poids du corps.",
    duration_minutes: 35,
    order_index: 2,
    exercises: [
      { name: "Pompes classiques", sets: 4, reps: "12", rest_seconds: 60, order_index: 1, notes: "Corps aligné, regard vers le sol" },
      { name: "Pompes prisé serrée", sets: 3, reps: "10", rest_seconds: 60, order_index: 2, notes: "Mains sous les épaules — isole mieux le pectoral interne" },
      { name: "Pompes déclinées (pieds sur chaise)", sets: 3, reps: "10", rest_seconds: 75, order_index: 3, notes: "Active la partie haute du pectoral" },
      { name: "Dips sur chaise", sets: 3, reps: "10", rest_seconds: 60, order_index: 4, notes: "Coudes dans l'axe, descend à 90°" },
    ],
  },
  {
    muscle_group: "dos",
    location: "salle",
    name: "Dos & Biceps — Salle",
    description: "Séance dorsaux et biceps en tirage. Posture et gainage au programme.",
    duration_minutes: 50,
    order_index: 3,
    exercises: [
      { name: "Tirage haute poulie prisé large", sets: 3, reps: "12", rest_seconds: 90, order_index: 1, notes: "Tire vers le haut du torse, coudes dans l'axe" },
      { name: "Rowing barre ou haltères", sets: 3, reps: "10", rest_seconds: 90, order_index: 2, notes: "Dos droit, omoplates en fin de mouvement" },
      { name: "Tirage horizontal poulie", sets: 3, reps: "12", rest_seconds: 60, order_index: 3, notes: "Squeeze dorsal à chaque répétition" },
      { name: "Curl barre", sets: 3, reps: "12", rest_seconds: 60, order_index: 4, notes: "Coudes fixés, pas de balance" },
    ],
  },
  {
    muscle_group: "dos",
    location: "maison",
    name: "Dos & Biceps — Maison",
    description: "Renforcement dorsal sans matériel. Parfait pour la posture et le bas du dos.",
    duration_minutes: 35,
    order_index: 4,
    exercises: [
      { name: "Superman (extension dorsale sol)", sets: 3, reps: "15", rest_seconds: 45, order_index: 1, notes: "Lève bras et jambes en même temps, tiens 2 secondes" },
      { name: "Rowing élastique (ou sac à dos lesté)", sets: 3, reps: "12", rest_seconds: 60, order_index: 2, notes: "Attaches l'élastique à une porte, tire vers le nombril" },
      { name: "Curl haltères (ou bouteilles d'eau)", sets: 3, reps: "12", rest_seconds: 60, order_index: 3, notes: "Tourne la paume vers le haut en montant" },
      { name: "Good morning (flexion buste)", sets: 3, reps: "15", rest_seconds: 45, order_index: 4, notes: "Genoux légèrement fléchis, dos bien droit — renforce les ischio et le bas du dos" },
    ],
  },
  {
    muscle_group: "jambes",
    location: "salle",
    name: "Jambes & Fessiers — Salle",
    description: "Séance jambes complète en machine et libre. Quadriceps, ischio, fessiers.",
    duration_minutes: 50,
    order_index: 5,
    exercises: [
      { name: "Squat barre ou goblet squat", sets: 4, reps: "12", rest_seconds: 90, order_index: 1, notes: "Genoux dans l'axe des pieds, descends jusqu'à la parallèle" },
      { name: "Presse à cuisse", sets: 3, reps: "12", rest_seconds: 90, order_index: 2, notes: "Pieds à largeur d'épaules, ne verrouille pas les genoux" },
      { name: "Fentes avant haltères", sets: 3, reps: "10 par jambe", rest_seconds: 75, order_index: 3, notes: "Genou arrière proche du sol, buste droit" },
      { name: "Leg curl allongé", sets: 3, reps: "12", rest_seconds: 60, order_index: 4, notes: "Mouvement lent en descente — ça compte autant que la montée" },
    ],
  },
  {
    muscle_group: "jambes",
    location: "maison",
    name: "Jambes & Fessiers — Maison",
    description: "Circuit jambes sans matériel. Efficace pour le tonus et la mobilité.",
    duration_minutes: 35,
    order_index: 6,
    exercises: [
      { name: "Squats poids du corps", sets: 4, reps: "15", rest_seconds: 60, order_index: 1, notes: "Lent à la descente (3 secondes), explose à la montée" },
      { name: "Fentes alternées", sets: 3, reps: "12 par jambe", rest_seconds: 60, order_index: 2, notes: "Garde le genou avant au-dessus du pied" },
      { name: "Glute bridge", sets: 3, reps: "15", rest_seconds: 45, order_index: 3, notes: "Pousse à travers les talons, serre les fessiers en haut" },
      { name: "Chaise au mur", sets: 3, reps: "45 sec", rest_seconds: 60, order_index: 4, notes: "Cuisses parallèles au sol, dos plat contre le mur" },
    ],
  },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reboot_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        location TEXT NOT NULL DEFAULT 'salle',
        description TEXT,
        duration_minutes INT,
        order_index INT NOT NULL DEFAULT 0
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reboot_exercises (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES reboot_sessions(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sets INT,
        reps TEXT,
        rest_seconds INT,
        vimeo_video_id TEXT,
        order_index INT DEFAULT 0,
        notes TEXT
      )
    `);

    let sessionsInserted = 0;
    let exercisesInserted = 0;
    let sessionsSkipped = 0;

    for (const s of SESSIONS) {
      // Check if session already exists
      const { rows: existing } = await pool.query(
        `SELECT id FROM reboot_sessions WHERE muscle_group = $1 AND location = $2`,
        [s.muscle_group, s.location]
      );

      let sessionId: string;

      if (existing.length > 0) {
        sessionId = existing[0].id;
        sessionsSkipped++;
      } else {
        const { rows } = await pool.query(
          `INSERT INTO reboot_sessions (name, muscle_group, location, description, duration_minutes, order_index)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [s.name, s.muscle_group, s.location, s.description, s.duration_minutes, s.order_index]
        );
        sessionId = rows[0].id;
        sessionsInserted++;
      }

      // Insert exercises only if session is new
      if (existing.length === 0) {
        for (const ex of s.exercises) {
          await pool.query(
            `INSERT INTO reboot_exercises (session_id, name, sets, reps, rest_seconds, order_index, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [sessionId, ex.name, ex.sets, ex.reps, ex.rest_seconds, ex.order_index, ex.notes]
          );
          exercisesInserted++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      sessionsInserted,
      sessionsSkipped,
      exercisesInserted,
    });
  } catch (err) {
    console.error("[seed/reboot]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
