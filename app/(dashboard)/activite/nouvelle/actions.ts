"use server"

import { auth } from "@/auth"
import { pool } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function ensureActivityColumns() {
  await pool.query(
    `ALTER TABLE workout_sessions ALTER COLUMN training_session_id DROP NOT NULL`
  ).catch(() => {})
  await pool.query(
    `ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS activity_type VARCHAR(100)`
  ).catch(() => {})
  await pool.query(
    `ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'programme'`
  ).catch(() => {})
}

export async function logFreeActivity(
  activityType: string,
  title: string,
  date: string,
  startTime: string,
  endTime: string,
  rpe: number,
  note: string
): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  await ensureActivityColumns()

  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  const durationMinutes = eh * 60 + em - (sh * 60 + sm)
  const durationSeconds = durationMinutes > 0 ? durationMinutes * 60 : null

  const startedAt = new Date(`${date}T${startTime}:00`)
  const completedAt = new Date(`${date}T${endTime}:00`)

  const { rows } = await pool.query(
    `INSERT INTO workout_sessions
       (client_id, training_session_id, activity_type, source, status, started_at, completed_at, duration_seconds, rpe)
     VALUES ($1, NULL, $2, 'libre', 'completed', $3, $4, $5, $6)
     RETURNING id`,
    [
      session.user.id,
      title.trim() || activityType,
      startedAt.toISOString(),
      completedAt.toISOString(),
      durationSeconds,
      rpe || null,
    ]
  )

  if (note.trim()) {
    await pool.query(
      `INSERT INTO session_notes (workout_session_id, client_id, content)
       VALUES ($1, $2, $3)`,
      [rows[0].id, session.user.id, note.trim()]
    ).catch(() => {})
  }

  revalidatePath("/dashboard")
  revalidatePath("/activites")
}
