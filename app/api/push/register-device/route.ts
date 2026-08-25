import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Enregistre le jeton APNs de l'appareil auprès de OneSignal.
 *
 * Pourquoi passer par le serveur plutôt que par le SDK OneSignal sur
 * l'appareil : ce SDK n'existe que sous forme de plugin Cordova, et le pont
 * Cordova ne se monte pas dans une WKWebView qui charge une page distante —
 * `window.cordova.exec` y est absent, donc le tout premier appel natif échoue.
 * L'app obtient donc son jeton via @capacitor/push-notifications, qui utilise
 * le pont Capacitor (celui-là fonctionne), et nous faisons l'enregistrement
 * ici. La clé REST reste ainsi côté serveur, où elle doit être.
 */

const ONESIGNAL_APP_ID = "07b914dd-bf51-42bf-80ba-43548a8d93d0";
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY ?? "";
const API = "https://api.onesignal.com";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientId = session.user.id;

  if (!REST_API_KEY) {
    console.error(
      "[push/register] ONESIGNAL_REST_API_KEY absente — impossible d'enregistrer l'appareil"
    );
    return NextResponse.json({ error: "Non configuré" }, { status: 503 });
  }

  let token: string;
  try {
    const body = (await request.json()) as { token?: unknown };
    token = String(body.token ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Corps illisible" }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: "Jeton manquant" }, { status: 400 });
  }

  // Le jeton n'est jamais journalisé en entier : sa longueur et son début
  // suffisent à vérifier qu'il est plausible.
  const shortToken = `${token.slice(0, 12)}… (${token.length})`;

  // Deux chemins, dans cet ordre. Attacher un abonnement suppose que
  // l'utilisateur existe déjà chez OneSignal ; s'il n'existe pas, on le crée
  // avec son abonnement en une fois.
  const attach = await callOneSignal(
    `${API}/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${encodeURIComponent(clientId)}/subscriptions`,
    { subscription: { type: "iOSPush", token, enabled: true } }
  );

  if (attach.ok) {
    console.log("[push/register] abonnement rattaché", { clientId, token: shortToken });
    return NextResponse.json({ ok: true, via: "subscriptions" });
  }

  console.warn("[push/register] rattachement refusé, création de l'utilisateur", {
    clientId,
    status: attach.status,
    body: attach.body.slice(0, 400),
  });

  const create = await callOneSignal(`${API}/apps/${ONESIGNAL_APP_ID}/users`, {
    identity: { external_id: clientId },
    subscriptions: [{ type: "iOSPush", token, enabled: true }],
  });

  if (create.ok) {
    console.log("[push/register] utilisateur créé avec son abonnement", {
      clientId,
      token: shortToken,
    });
    return NextResponse.json({ ok: true, via: "users" });
  }

  console.error("[push/register] OneSignal a refusé les deux voies", {
    clientId,
    token: shortToken,
    subscriptions: { status: attach.status, body: attach.body.slice(0, 400) },
    users: { status: create.status, body: create.body.slice(0, 400) },
  });
  return NextResponse.json({ error: "Enregistrement refusé" }, { status: 502 });
}

/**
 * OneSignal a changé de schéma d'authentification entre l'ancienne API
 * (`Basic <clé>`) et api.onesignal.com (`Key <clé>`), et les deux coexistent
 * selon les endpoints. Plutôt que de parier sur l'un, on essaie le nouveau puis
 * l'ancien — et on journalise lequel a été accepté.
 */
async function callOneSignal(
  url: string,
  payload: unknown
): Promise<{ ok: boolean; status: number; body: string }> {
  let last = { ok: false, status: 0, body: "aucune tentative" };

  for (const scheme of ["Key", "Basic"]) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${scheme} ${REST_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.text();
      if (res.ok) {
        console.log(`[push/register] OneSignal a accepté le schéma « ${scheme} »`);
        return { ok: true, status: res.status, body };
      }
      last = { ok: false, status: res.status, body };
      // Un refus qui n'est pas d'authentification ne sera pas réglé en
      // changeant de schéma : inutile de réessayer.
      if (res.status !== 401 && res.status !== 403) break;
    } catch (err) {
      last = { ok: false, status: 0, body: err instanceof Error ? err.message : String(err) };
    }
  }

  return last;
}
