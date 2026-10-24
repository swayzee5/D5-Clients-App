"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ageDepuis } from "@/lib/age";

/**
 * La date de naissance, saisie par le client lui-même.
 *
 * L'âge était enregistré mesure par mesure : il fallait donc le ressaisir à
 * chaque fois, et il devenait faux dès l'anniversaire passé. Une date de
 * naissance se donne une fois et reste juste pour toujours.
 *
 * Elle sert au coach — l'entraînement d'un homme de 42 ans n'est pas celui
 * d'un homme de 55 — et c'est le client qui la connaît.
 */
export async function enregistrerNaissance(
  date: string
): Promise<{ ok: boolean; erreur?: string; age?: number }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erreur: "Session expirée." };

  const jour = date?.trim();
  if (!jour) return { ok: false, erreur: "Date manquante." };

  const d = new Date(jour);
  if (Number.isNaN(d.getTime())) return { ok: false, erreur: "Date invalide." };

  // Bornes larges, mais elles écartent les deux fautes de frappe courantes :
  // l'année tapée en deux chiffres, et le jour et le mois inversés dans un
  // champ de date mal rempli.
  const age = ageDepuis(jour);
  if (age < 14 || age > 100) {
    return { ok: false, erreur: "Vérifie l'année : la date saisie donne un âge improbable." };
  }

  try {
    await pool
      .query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date DATE`)
      .catch(() => {});
    await pool.query(`UPDATE clients SET birth_date = $1::date WHERE id = $2`, [
      jour,
      session.user.id,
    ]);
    revalidatePath("/profil");
    return { ok: true, age };
  } catch (err) {
    console.error("[enregistrerNaissance]", err);
    return { ok: false, erreur: "Enregistrement impossible." };
  }
}
