import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Relais de diagnostic pour l'initialisation des notifications.
 *
 * Le problème qu'il résout est pratique, pas technique : les logs de l'app iOS
 * ne se lisent qu'avec un Mac (Safari → Développement, ou Xcode), et le coach
 * n'en a pas. Sans ça, on ne peut pas savoir si le plugin OneSignal s'exécute
 * sur l'appareil — et un échec d'initialisation produit exactement le même
 * silence qu'une notification qui n'arrive pas.
 *
 * L'app poste ici ce qu'elle observe, et les lignes ressortent dans les logs
 * Vercel, lisibles depuis n'importe quel navigateur.
 *
 * Diagnostic temporaire : à retirer une fois les notifications réglées.
 */

const MAX_EVENTS = 20;
const MAX_MESSAGE = 200;
const MAX_DATA = 2000;

type Incoming = { message?: unknown; data?: unknown };

export async function POST(request: Request) {
  // Réservé aux clients connectés : sans ça, l'endpoint serait un moyen ouvert
  // de remplir les logs de production.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { events?: Incoming[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps illisible" }, { status: 400 });
  }

  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  if (events.length === 0) {
    return NextResponse.json({ ok: true, logged: 0 });
  }

  for (const event of events) {
    const message = String(event.message ?? "").slice(0, MAX_MESSAGE);
    // Les données arrivent en JSON déjà sérialisé par l'app : on les tronque
    // sans chercher à les interpréter, pour qu'un objet inattendu ne fasse pas
    // échouer la route.
    const data =
      event.data === undefined ? "" : String(event.data).slice(0, MAX_DATA);
    console.log(`[push-diag] ${session.user.id} | ${message}`, data);
  }

  return NextResponse.json({ ok: true, logged: events.length });
}
