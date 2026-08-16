import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

// Le badge de la messagerie vit dans le layout, et un layout Next n'est pas
// re-rendu lors des navigations internes : le compteur restait figé sur la
// valeur calculée à l'ouverture de l'app. La barre de navigation interroge donc
// cette route pour se tenir à jour.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM messages
       WHERE client_id = $1 AND sender_role = 'coach' AND is_read = false`,
      [session.user.id]
    );
    return NextResponse.json({ count: parseInt(result.rows[0].count) || 0 });
  } catch (err) {
    console.error("[api/messages/unread]", err);
    return NextResponse.json({ count: 0, error: "unavailable" });
  }
}
