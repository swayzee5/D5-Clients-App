"use server";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitComment(
  clientId: string,
  programId: string | null,
  formData: FormData
) {
  const content = (formData.get("content") as string | null)?.trim();
  if (!content) return;
  await pool.query(
    `INSERT INTO client_comments (client_id, program_id, content) VALUES ($1, $2, $3)`,
    [clientId, programId ?? null, content]
  );
  revalidatePath("/programme");
}
