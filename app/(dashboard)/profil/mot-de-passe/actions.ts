"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function changePassword(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session) redirect("/login");

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Tous les champs sont obligatoires" };
  }

  if (newPassword.length < 8) {
    return { error: "Le nouveau mot de passe doit faire au moins 8 caractères" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas" };
  }

  const { rows } = await pool.query<{ password_hash: string }>(
    "SELECT password_hash FROM clients WHERE id = $1",
    [session.user.id]
  );

  if (!rows.length) return { error: "Compte introuvable" };

  const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!isValid) return { error: "Mot de passe actuel incorrect" };

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    "UPDATE clients SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    [newHash, session.user.id]
  );

  return { success: true };
}
