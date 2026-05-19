import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Mapping: reboot muscle group -> seance_template name to pull exercises from
const MUSCLE_TEMPLATE_MAP = [
  {
    muscle_group: "pecs",
    location: "salle",
    name: "Pectoraux",
    description: "Séance poitrine complète. Objectif : activation et développement pectoral.",
    order_index: 1,
    template_name: "Séance Pectoraux",
  },
  {
    muscle_group: "dos",
    location: "salle",
    name: "Dos & Biceps",
    description: "Séance dorsaux et biceps. Focus sur la posture et la largeur du dos.",
    order_index: 2,
    template_name: "Séance Dos",
  },
  {
    muscle_group: "jambes",
    location: "salle",
    name: "Jambes & Fessiers",
    description: "Séance jambes complète. Quadriceps, ischio-jambiers et fessiers.",
    order_index: 3,
    template_name: "Séance Jambes Homme",
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

    for (const entry of MUSCLE_TEMPLATE_MAP) {
      // Skip if session already exists for this muscle group
      const { rows: existing } = await pool.query(
        `SELECT id FROM reboot_sessions WHERE muscle_group = $1 AND location = $2`,
        [entry.muscle_group, entry.location]
      );

      if (existing.length > 0) {
        sessionsSkipped++;
        continue;
      }

      // Try to find matching seance_template
      const { rows: templateRows } = await pool.query(
        `SELECT id, duration_minutes FROM seance_templates WHERE name = $1 LIMIT 1`,
        [entry.template_name]
      ).catch(() => ({ rows: [] as { id: string; duration_minutes: number }[] }));

      const template = templateRows[0] ?? null;

      // Create the reboot session
      const { rows: sessionRows } = await pool.query(
        `INSERT INTO reboot_sessions (name, muscle_group, location, description, duration_minutes, order_index)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          entry.name,
          entry.muscle_group,
          entry.location,
          entry.description,
          template?.duration_minutes ?? 50,
          entry.order_index,
        ]
      );
      const sessionId = sessionRows[0].id;
      sessionsInserted++;

      if (template) {
        // Copy exercises from the seance_template
        const { rows: exercises } = await pool.query(
          `SELECT exercise_name, sets, reps, rest_seconds, order_index, notes
           FROM seance_template_exercises
           WHERE seance_template_id = $1
           ORDER BY order_index ASC`,
          [template.id]
        );

        for (const ex of exercises) {
          await pool.query(
            `INSERT INTO reboot_exercises (session_id, name, sets, reps, rest_seconds, order_index, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [sessionId, ex.exercise_name, ex.sets, ex.reps, ex.rest_seconds, ex.order_index, ex.notes]
          );
          exercisesInserted++;
        }
      } else {
        // seance_templates not seeded yet — insert a placeholder so the session is not empty
        await pool.query(
          `INSERT INTO reboot_exercises (session_id, name, sets, reps, rest_seconds, order_index, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [sessionId, "Les exercices arrivent après le seed des séances", null, null, null, 0,
           "Lance d'abord GET /api/seed/seances?secret=... puis relance ce seed avec ?reset=1"]
        );
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
