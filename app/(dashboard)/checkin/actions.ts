"use server"

import { auth } from "@/auth"
import { pool } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function submitCheckin(
  energy: number,
  sleep: number,
  stress: number,
  weight: string,
  note: string
): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  await pool.query(`
    CREATE TABLE IF NOT EXISTS weekly_checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL,
      energy INT NOT NULL,
      sleep INT NOT NULL,
      stress INT NOT NULL,
      weight DECIMAL(5,2),
      note TEXT,
      is_read BOOLEAN DEFAULT false,
      submitted_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})

  const weightVal = weight.trim() ? parseFloat(weight.replace(",", ".")) : null

  await pool.query(
    `INSERT INTO weekly_checkins (client_id, energy, sleep, stress, weight, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [session.user.id, energy, sleep, stress, weightVal, note.trim() || null]
  )

  revalidatePath("/dashboard")
}
