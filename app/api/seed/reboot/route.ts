import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const MUSCLE_TEMPLATE_MAP = [
  { muscle_group: "pecs",     location: "salle", name: "Pectoraux",                desc: "Poitrine, épaules antérieures et triceps.",                order_index: 1,  template_name: "Séance Pectoraux" },
  { muscle_group: "dos",      location: "salle", name: "Dos & Biceps",            desc: "Grand dorsal, trapèzes et biceps.",                        order_index: 2,  template_name: "Séance Dos" },
  { muscle_group: "epaules",  location: "salle", name: "Épaules",                  desc: "Deltoïdes, trapèzes et coiffes des rotateurs.",             order_index: 3,  template_name: "Séance Épaules" },
  { muscle_group: "bras",     location: "salle", name: "Bras",                    desc: "Biceps, triceps et avant-bras.",                           order_index: 4,  template_name: "Séance Bras" },
  { muscle_group: "jambes_h", location: "salle", name: "Jambes Homme",            desc: "Quadriceps, ischio-jambiers, fessiers et mollets.",         order_index: 5,  template_name: "Séance Jambes Homme" },
  { muscle_group: "jambes_f", location: "salle", name: "Jambes & Fessiers Femme", desc: "Fessiers, quadriceps et adducteurs.",                      order_index: 6,  template_name: "Séance Fessiers & Jambes Femme A" },
  { muscle_group: "fullbody", location: "salle", name: "Full Body Express",       desc: "Corps entier en une séance, idéal pour les semaines chargées.", order_index: 7, template_name: "Full Body Express" },
  { muscle_group: "gainage",  location: "salle", name: "Gainage & Abdominaux",    desc: "Core, stabilité et gainage profond.",                       order_index: 8,  template_name: "Gainage & Abdominaux" },
  { muscle_group: "abdos",    location: "salle", name: "Abdominaux",              desc: "Droits, obliques et transverse.",                          order_index: 9,  template_name: "Abdominaux — Poids de corps" },
  { muscle_group: "cardio",   location: "salle", name: "Cardio & Mobilité",        desc: "Endurance, flexibilité et récupération active.",              order_index: 10, template_name: "Cardio & Mobilité" },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reset = req.nextUrl.searchParams.get("reset") === "1";
  try {
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
    if (reset) {
      await pool.query(`DELETE FROM reboot_exercises`);
      await pool.query(`DELETE FROM reboot_sessions`);
    }
    let sessionsInserted = 0, exercisesInserted = 0, sessionsSkipped = 0;
    for (const entry of MUSCLE_TEMPLATE_MAP) {
      const { rows: existing } = await pool.query(
        `SELECT id FROM reboot_sessions WHERE muscle_group = $1`, [entry.muscle_group]
      );
      if (existing.length > 0) { sessionsSkipped++; continue; }
      const { rows: tplRows } = await pool.query(
        `SELECT id, duration_minutes FROM seance_templates WHERE name = $1 LIMIT 1`, [entry.template_name]
      ).catch(() => ({ rows: [] as { id: string; duration_minutes: number }[] }));
      const tpl = tplRows[0] ?? null;
      const { rows: sessionRows } = await pool.query(
        `INSERT INTO reboot_sessions (name, muscle_group, location, description, duration_minutes, order_index)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [entry.name, entry.muscle_group, entry.location, entry.desc, tpl?.duration_minutes ?? 45, entry.order_index]
      );
      const sessionId = sessionRows[0].id;
      sessionsInserted++;
      if (tpl) {
        const { rows: exercises } = await pool.query(
          `SELECT ste.exercise_name, ste.sets, ste.reps, ste.rest_seconds, ste.order_index, ste.notes,
                  (
                    SELECT te.vimeo_video_id
                    FROM training_exercises te
                    WHERE LOWER(TRIM(te.name)) = LOWER(TRIM(ste.exercise_name))
                      AND te.vimeo_video_id IS NOT NULL
                    LIMIT 1
                  ) AS vimeo_video_id
           FROM seance_template_exercises ste
           WHERE ste.seance_template_id = $1
           ORDER BY ste.order_index ASC`,
          [tpl.id]
        );
        for (const ex of exercises) {
          await pool.query(
            `INSERT INTO reboot_exercises (session_id, name, sets, reps, rest_seconds, vimeo_video_id, order_index, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [sessionId, ex.exercise_name, ex.sets, ex.reps, ex.rest_seconds, ex.vimeo_video_id ?? null, ex.order_index, ex.notes]
          );
          exercisesInserted++;
        }
      }
    }
    return NextResponse.json({ ok: true, sessionsInserted, sessionsSkipped, exercisesInserted });
  } catch (err) {
    console.error("[seed/reboot]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
