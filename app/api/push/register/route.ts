import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { playerId } = body;
  if (!playerId)
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  await pool
    .query(
      `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(client_id, player_id)
      )`
    )
    .catch(() => {});

  await pool
    .query(
      `INSERT INTO push_subscriptions (client_id, player_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [session.user.id, playerId]
    )
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
