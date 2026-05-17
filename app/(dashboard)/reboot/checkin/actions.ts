"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitMidCheckin(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;
  const clientId = session.user.id;

  const energy       = formData.get("energy")       ? parseInt(formData.get("energy") as string)       : null;
  const sleepQuality = formData.get("sleepQuality") ? parseInt(formData.get("sleepQuality") as string) : null;
  const weight       = formData.get("weight")       ? parseFloat(formData.get("weight") as string)     : null;
  const feeling      = (formData.get("feeling") as string) || null;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reboot_mid_checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT NOT NULL UNIQUE,
      weight DECIMAL(5,2),
      energy INT,
      sleep_quality INT,
      feeling TEXT,
      is_read BOOLEAN DEFAULT false,
      submitted_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await pool.query(
    `INSERT INTO reboot_mid_checkins (client_id, energy, sleep_quality, weight, feeling, submitted_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (client_id)
     DO UPDATE SET
       energy = EXCLUDED.energy,
       sleep_quality = EXCLUDED.sleep_quality,
       weight = EXCLUDED.weight,
       feeling = EXCLUDED.feeling,
       is_read = false,
       submitted_at = now()`,
    [clientId, energy, sleepQuality, weight, feeling]
  );

  revalidatePath("/reboot");
}
