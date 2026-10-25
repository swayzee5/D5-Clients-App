import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getRepas } from "@/lib/queries/journal-repas";
import { lirePhoto } from "@/lib/photo-repas";

/**
 * Sert la photo d'un repas, après vérification.
 *
 * Les photos sont déposées en accès privé : elles n'ont pas d'adresse publique
 * et ne peuvent être lues que par là. Le contrôle est simple et volontairement
 * strict — seul le client qui a envoyé la photo peut la voir depuis cette
 * application.
 *
 * Le CRM est accepté lui aussi, avec le secret partagé des appels entre les
 * deux applications — le même que la route de notification. C'est l'app
 * cliente qui est reliée au store privé ; relier le CRM au même store relève
 * d'une manipulation dans la console Vercel qui s'est révélée introuvable, et
 * le coach ne voyait donc aucune photo. Faire relayer la lecture par celle des
 * deux applications qui a déjà les accès ne demande aucune configuration, et
 * ne donne pas un deuxième endroit où les identifiants du store peuvent
 * fuir. Le secret ne se lit que dans l'en-tête `Authorization` : dans l'URL,
 * il finirait dans les journaux d'accès.
 *
 * `private, no-store` plutôt qu'un cache long : une image de ce type ne doit
 * pas rester dans le cache d'un proxy partagé, et le gain d'un cache sur une
 * photo consultée deux ou trois fois est nul.
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const secret = process.env.CRON_SECRET;
  const fourni = req.headers.get("authorization")?.replace(/^Bearer /, "");
  const estLeCrm = Boolean(secret && fourni === secret);

  const session = estLeCrm ? null : await auth();
  if (!estLeCrm && !session?.user?.id) return new Response("Non autorisé", { status: 401 });

  const repas = await getRepas(params.id).catch(() => null);
  if (!repas) return new Response("Introuvable", { status: 404 });

  // Même réponse que pour une photo inexistante : distinguer les deux
  // apprendrait à un curieux quels identifiants existent.
  if (!estLeCrm && repas.clientId !== session!.user!.id) {
    return new Response("Introuvable", { status: 404 });
  }

  const photo = await lirePhoto(repas.photoPath);
  if (!photo) return new Response("Introuvable", { status: 404 });

  return new Response(photo.corps, {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": "private, no-store",
    },
  });
}
