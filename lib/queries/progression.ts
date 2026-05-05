import { pool } from "@/lib/db"

export interface ProgressEntry {
  id: string
  entryDate: string
  weightKg: number | null
  waistCm: number | null
  chestCm: number | null
  hipsCm: number | null
  armsCm: number | null
  thighsCm: number | null
  notes: string | null
}

export async function getProgressEntries(clientId: string): Promise<ProgressEntry[]> {
  const result = await pool.query(
    `SELECT id, entry_date, weight_kg, waist_cm, chest_cm, hips_cm, arms_cm, thighs_cm, notes
     FROM progress_entries
     WHERE client_id = $1
     ORDER BY entry_date DESC
     LIMIT 50`,
    [clientId]
  )

  return result.rows.map((row) => ({
    id: row.id,
    entryDate: row.entry_date instanceof Date
      ? row.entry_date.toISOString().split("T")[0]
      : String(row.entry_date),
    weightKg: row.weight_kg !== null ? parseFloat(row.weight_kg) : null,
    waistCm: row.waist_cm !== null ? parseFloat(row.waist_cm) : null,
    chestCm: row.chest_cm !== null ? parseFloat(row.chest_cm) : null,
    hipsCm: row.hips_cm !== null ? parseFloat(row.hips_cm) : null,
    armsCm: row.arms_cm !== null ? parseFloat(row.arms_cm) : null,
    thighsCm: row.thighs_cm !== null ? parseFloat(row.thighs_cm) : null,
    notes: row.notes ?? null,
  }))
}
