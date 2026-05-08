"use server"

import { auth } from "@/auth"
import { pool } from "@/lib/db"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const schema = z.object({
  entryDate: z.string().min(1),
  heightCm: z.coerce.number().positive().optional(),
  ageYears: z.coerce.number().positive().optional(),
  weightKg: z.coerce.number().positive().optional(),
  waistCm: z.coerce.number().positive().optional(),
  chestCm: z.coerce.number().positive().optional(),
  hipsCm: z.coerce.number().positive().optional(),
  armsCm: z.coerce.number().positive().optional(),
  thighsCm: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
})

export async function addProgressEntry(formData: FormData) {
  const session = await auth()
  if (!session) redirect("/login")

  const keys = ["entryDate", "heightCm", "ageYears", "weightKg", "waistCm", "chestCm", "hipsCm", "armsCm", "thighsCm", "notes"]
  const raw = Object.fromEntries(
    keys.map((k) => [k, formData.get(k) || undefined])
  )

  const parsed = schema.safeParse(raw)
  if (!parsed.success) return

  const d = parsed.data

  await pool.query(
    `INSERT INTO progress_entries
       (client_id, entry_date, height_cm, age_years, weight_kg, waist_cm, chest_cm, hips_cm, arms_cm, thighs_cm, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (client_id, entry_date)
     DO UPDATE SET
       height_cm = COALESCE(EXCLUDED.height_cm, progress_entries.height_cm),
       age_years = COALESCE(EXCLUDED.age_years, progress_entries.age_years),
       weight_kg = COALESCE(EXCLUDED.weight_kg, progress_entries.weight_kg),
       waist_cm  = COALESCE(EXCLUDED.waist_cm,  progress_entries.waist_cm),
       chest_cm  = COALESCE(EXCLUDED.chest_cm,  progress_entries.chest_cm),
       hips_cm   = COALESCE(EXCLUDED.hips_cm,   progress_entries.hips_cm),
       arms_cm   = COALESCE(EXCLUDED.arms_cm,   progress_entries.arms_cm),
       thighs_cm = COALESCE(EXCLUDED.thighs_cm, progress_entries.thighs_cm),
       notes     = COALESCE(EXCLUDED.notes,     progress_entries.notes)`,
    [
      session.user.id,
      d.entryDate,
      d.heightCm ?? null,
      d.ageYears ?? null,
      d.weightKg ?? null,
      d.waistCm ?? null,
      d.chestCm ?? null,
      d.hipsCm ?? null,
      d.armsCm ?? null,
      d.thighsCm ?? null,
      d.notes ?? null,
    ]
  )

  revalidatePath("/progression")
  redirect("/progression")
}
