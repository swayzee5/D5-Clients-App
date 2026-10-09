import { NextRequest } from "next/server";
import { jsonUtf8 } from "@/lib/json-utf8";
import { sendPushToClient } from "@/lib/push";
import { getRepas } from "@/lib/queries/journal-repas";

/**
 * Prévient un client que son coach a répondu à un repas.
 *
 * Appelée par le CRM, qui est une application distincte : les identifiants
 * OneSignal ne vivent que dans celle-ci, et les recopier là-bas ferait deux
 * endroits à tenir à jour et deux endroits où ils peuvent fuir. Le CRM écrit
 * la réponse en base, puis appelle cette route.
 *
 * Même secret que les tâches planifiées. Un appel non authentifié pourrait
 * envoyer n'importe quelle notification à n'importe quel client.
 */

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const fourni =
    req.headers.get("authorization")?.replace(/^Bearer /, "") ??
    req.nextUrl.searchParams.get("secret");
  if (!secret || fourni !== secret) {
    return jsonUtf8({ error: "Unauthorized" }, { status: 401 });
  }

  let repasId: string;
  try {
    const corps = (await req.json()) as { repasId?: string };
    if (!corps.repasId) return jsonUtf8({ error: "repasId manquant" }, { status: 400 });
    repasId = corps.repasId;
  } catch {
    return jsonUtf8({ error: "Corps illisible" }, { status: 400 });
  }

  const repas = await getRepas(repasId).catch(() => null);
  if (!repas) return jsonUtf8({ error: "Repas introuvable" }, { status: 404 });

  // Rien à annoncer tant qu'il n'y a pas de réponse : une notification « ton
  // coach a répondu » qui ouvre un écran sans réponse est pire que rien.
  if (!repas.coachReply) {
    return jsonUtf8({ envoyé: false, raison: "aucune réponse enregistrée" });
  }

  // Le début de la réponse dans la notification : le client sait de quoi il
  // s'agit sans ouvrir, et ouvre justement pour cette raison.
  const apercu =
    repas.coachReply.length > 110 ? `${repas.coachReply.slice(0, 107)}…` : repas.coachReply;

  await sendPushToClient(repas.clientId, "Daye a répondu à ton repas", apercu, "/nutrition/journal");
  return jsonUtf8({ envoyé: true });
}
