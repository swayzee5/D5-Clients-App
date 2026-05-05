import { pool } from "@/lib/db"

export interface NutritionFile {
  id: string
  name: string
  fileUrl: string
  fileName: string
  fileSize: number | null
  uploadedAt: string
  isActive: boolean
}

export async function getNutritionFiles(clientId: string): Promise<NutritionFile[]> {
  const result = await pool.query(
    `SELECT id, name, file_url, file_name, file_size, uploaded_at, is_active
     FROM nutrition_files
     WHERE client_id = $1 AND is_active = true
     ORDER BY uploaded_at DESC`,
    [clientId]
  )

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
    isActive: row.is_active,
  }))
}
